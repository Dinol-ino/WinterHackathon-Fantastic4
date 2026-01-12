// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RealEstateMarketplace
 * @dev Real estate tokenization with primary sales and secondary resale marketplace
 * 
 * Key Features:
 * - Admin lists properties with fractional shares (primary sale)
 * - Users buy shares from primary listing
 * - Users can resell owned shares at custom prices (secondary market)
 * - Current market price = last successful resale price
 * - Average price calculated from last N resales
 * - Implied market value = current price × total shares
 */
contract RealEstateMarketplace is ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // =========================================
    // STATE VARIABLES
    // =========================================
    
    uint256 public nextPropertyId;
    uint256 public nextListingId;
    
    // Number of resales to track for average calculation
    uint256 public constant RESALE_HISTORY_SIZE = 10;

    // =========================================
    // STRUCTS
    // =========================================
    
    struct Property {
        uint256 id;
        uint256 initialPricePerShare;  // Original listing price (never changes)
        uint256 currentPrice;          // Latest market price (updated on resales)
        uint256 totalShares;
        uint256 sharesSold;            // From primary sale
        address owner;                 // Admin/Seller who listed
        bool isActive;
        string metadataURI;            // IPFS metadata link
    }
    
    struct ResaleListing {
        uint256 listingId;
        uint256 propertyId;
        address seller;
        uint256 sharesForSale;
        uint256 pricePerShare;         // Seller's chosen price
        uint256 sharesSold;
        bool isActive;
        uint256 createdAt;
    }
    
    struct ResaleTransaction {
        uint256 propertyId;
        uint256 pricePerShare;
        uint256 shares;
        uint256 timestamp;
        address buyer;
        address seller;
    }

    // =========================================
    // MAPPINGS
    // =========================================
    
    // propertyId => Property Details
    mapping(uint256 => Property) public properties;
    
    // propertyId => (userAddress => sharesOwned)
    mapping(uint256 => mapping(address => uint256)) public userShares;
    
    // listingId => ResaleListing
    mapping(uint256 => ResaleListing) public resaleListings;
    
    // propertyId => array of resale listing IDs
    mapping(uint256 => uint256[]) public propertyResaleListings;
    
    // propertyId => array of last N resale prices (circular buffer)
    mapping(uint256 => uint256[]) public resalePriceHistory;
    
    // propertyId => index for circular buffer
    mapping(uint256 => uint256) private resaleHistoryIndex;

    // =========================================
    // EVENTS
    // =========================================
    
    event PropertyListed(
        uint256 indexed id, 
        address indexed owner, 
        uint256 pricePerShare, 
        uint256 totalShares,
        string metadataURI
    );
    
    event SharesPurchased(
        uint256 indexed propertyId, 
        address indexed buyer, 
        uint256 shares, 
        uint256 amountSpent,
        bool isPrimaryPurchase
    );
    
    event ResaleListingCreated(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed seller,
        uint256 shares,
        uint256 pricePerShare
    );
    
    event ResaleCompleted(
        uint256 indexed listingId,
        uint256 indexed propertyId,
        address indexed buyer,
        address seller,
        uint256 shares,
        uint256 pricePerShare,
        uint256 newMarketPrice
    );
    
    event ResaleListingCancelled(uint256 indexed listingId);
    
    event MarketPriceUpdated(
        uint256 indexed propertyId, 
        uint256 oldPrice, 
        uint256 newPrice
    );

    // =========================================
    // CONSTRUCTOR
    // =========================================
    
    constructor() ERC721("RealEstateToken", "RET") Ownable(msg.sender) {}

    // =========================================
    // PRIMARY SALE FUNCTIONS
    // =========================================
    
    /**
     * @dev Admin lists a new property for sale (primary listing)
     * @param _pricePerShare Price per share in Wei
     * @param _totalShares Total number of fractional shares
     * @param _tokenURI IPFS metadata URI
     */
    function listProperty(
        uint256 _pricePerShare,
        uint256 _totalShares,
        string calldata _tokenURI
    ) external onlyOwner {
        require(_pricePerShare > 0, "Price must be > 0");
        require(_totalShares > 0, "Shares must be > 0");
        
        uint256 propertyId = nextPropertyId;
        
        // Create property record
        properties[propertyId] = Property({
            id: propertyId,
            initialPricePerShare: _pricePerShare,
            currentPrice: _pricePerShare,  // Starts at initial price
            totalShares: _totalShares,
            sharesSold: 0,
            owner: msg.sender,
            isActive: true,
            metadataURI: _tokenURI
        });
        
        // Mint NFT representing this property
        _mint(msg.sender, propertyId);
        _setTokenURI(propertyId, _tokenURI);
        
        nextPropertyId++;
        
        emit PropertyListed(propertyId, msg.sender, _pricePerShare, _totalShares, _tokenURI);
    }
    
    /**
     * @dev Buy shares from primary listing (from admin)
     * @param _propertyId Property to buy shares from
     * @param _sharesToBuy Number of shares to purchase
     */
    function buyShares(
        uint256 _propertyId, 
        uint256 _sharesToBuy
    ) external payable nonReentrant {
        Property storage property = properties[_propertyId];
        
        require(property.isActive, "Property not active");
        require(_sharesToBuy > 0, "Must buy at least 1 share");
        
        uint256 availableShares = property.totalShares - property.sharesSold;
        require(_sharesToBuy <= availableShares, "Not enough shares available");
        
        // Use initial price for primary sales
        uint256 totalCost = _sharesToBuy * property.initialPricePerShare;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Update state
        property.sharesSold += _sharesToBuy;
        userShares[_propertyId][msg.sender] += _sharesToBuy;
        
        // Transfer funds to property owner
        payable(property.owner).transfer(totalCost);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit SharesPurchased(_propertyId, msg.sender, _sharesToBuy, totalCost, true);
    }

    // =========================================
    // RESALE MARKETPLACE FUNCTIONS
    // =========================================
    
    /**
     * @dev List owned shares for resale at custom price
     * @param _propertyId Property whose shares to sell
     * @param _shares Number of shares to list
     * @param _pricePerShare Seller's chosen price per share
     */
    function listSharesForResale(
        uint256 _propertyId,
        uint256 _shares,
        uint256 _pricePerShare
    ) external returns (uint256) {
        require(_shares > 0, "Must list at least 1 share");
        require(_pricePerShare > 0, "Price must be > 0");
        require(userShares[_propertyId][msg.sender] >= _shares, "Insufficient shares");
        
        uint256 listingId = nextListingId;
        
        // Create resale listing
        resaleListings[listingId] = ResaleListing({
            listingId: listingId,
            propertyId: _propertyId,
            seller: msg.sender,
            sharesForSale: _shares,
            pricePerShare: _pricePerShare,
            sharesSold: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Track listing for this property
        propertyResaleListings[_propertyId].push(listingId);
        
        // Lock shares (deduct from available balance)
        userShares[_propertyId][msg.sender] -= _shares;
        
        nextListingId++;
        
        emit ResaleListingCreated(listingId, _propertyId, msg.sender, _shares, _pricePerShare);
        
        return listingId;
    }
    
    /**
     * @dev Buy shares from a resale listing
     * @param _listingId Resale listing to buy from
     * @param _sharesToBuy Number of shares to purchase
     * 
     * IMPORTANT: This updates the market price!
     */
    function buyFromResale(
        uint256 _listingId,
        uint256 _sharesToBuy
    ) external payable nonReentrant {
        ResaleListing storage listing = resaleListings[_listingId];
        
        require(listing.isActive, "Listing not active");
        require(_sharesToBuy > 0, "Must buy at least 1");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        
        uint256 availableShares = listing.sharesForSale - listing.sharesSold;
        require(_sharesToBuy <= availableShares, "Not enough shares in listing");
        
        uint256 totalCost = _sharesToBuy * listing.pricePerShare;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Transfer shares to buyer
        userShares[listing.propertyId][msg.sender] += _sharesToBuy;
        listing.sharesSold += _sharesToBuy;
        
        // Check if listing is fully sold
        if (listing.sharesSold >= listing.sharesForSale) {
            listing.isActive = false;
        }
        
        // *** UPDATE MARKET PRICE ***
        // Only completed resale transactions affect market price
        Property storage property = properties[listing.propertyId];
        uint256 oldPrice = property.currentPrice;
        property.currentPrice = listing.pricePerShare;
        
        // Record in price history for average calculation
        _recordResalePrice(listing.propertyId, listing.pricePerShare);
        
        // Transfer funds to seller
        payable(listing.seller).transfer(totalCost);
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit ResaleCompleted(
            _listingId,
            listing.propertyId,
            msg.sender,
            listing.seller,
            _sharesToBuy,
            listing.pricePerShare,
            property.currentPrice
        );
        
        if (oldPrice != property.currentPrice) {
            emit MarketPriceUpdated(listing.propertyId, oldPrice, property.currentPrice);
        }
    }
    
    /**
     * @dev Cancel a resale listing (returns shares to seller)
     * @param _listingId Listing to cancel
     */
    function cancelResaleListing(uint256 _listingId) external {
        ResaleListing storage listing = resaleListings[_listingId];
        
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.isActive, "Listing not active");
        
        // Return unsold shares to seller
        uint256 unsoldShares = listing.sharesForSale - listing.sharesSold;
        userShares[listing.propertyId][msg.sender] += unsoldShares;
        
        listing.isActive = false;
        
        emit ResaleListingCancelled(_listingId);
    }
    
    /**
     * @dev Internal function to record resale price in history
     */
    function _recordResalePrice(uint256 _propertyId, uint256 _price) internal {
        uint256[] storage history = resalePriceHistory[_propertyId];
        
        if (history.length < RESALE_HISTORY_SIZE) {
            // Still filling the buffer
            history.push(_price);
        } else {
            // Circular buffer - overwrite oldest
            uint256 index = resaleHistoryIndex[_propertyId];
            history[index] = _price;
            resaleHistoryIndex[_propertyId] = (index + 1) % RESALE_HISTORY_SIZE;
        }
    }

    // =========================================
    // VIEW FUNCTIONS - PRICING
    // =========================================
    
    /**
     * @dev Get current market price (last resale price, or initial if no resales)
     * @param _propertyId Property to query
     * @return Current price per share in Wei
     */
    function getMarketPrice(uint256 _propertyId) external view returns (uint256) {
        return properties[_propertyId].currentPrice;
    }
    
    /**
     * @dev Get initial listing price (never changes, for reference)
     * @param _propertyId Property to query
     * @return Initial price per share in Wei
     */
    function getInitialPrice(uint256 _propertyId) external view returns (uint256) {
        return properties[_propertyId].initialPricePerShare;
    }
    
    /**
     * @dev Calculate average price from last N resales
     * @param _propertyId Property to query
     * @return Average price in Wei, or 0 if no resales
     */
    function getAverageResalePrice(uint256 _propertyId) external view returns (uint256) {
        uint256[] storage history = resalePriceHistory[_propertyId];
        
        if (history.length == 0) {
            return properties[_propertyId].initialPricePerShare;
        }
        
        uint256 sum = 0;
        for (uint256 i = 0; i < history.length; i++) {
            sum += history[i];
        }
        
        return sum / history.length;
    }
    
    /**
     * @dev Calculate implied market value of entire property
     * Formula: currentPrice × totalShares
     * @param _propertyId Property to query
     * @return Total implied value in Wei
     */
    function getImpliedMarketValue(uint256 _propertyId) external view returns (uint256) {
        Property storage property = properties[_propertyId];
        return property.currentPrice * property.totalShares;
    }
    
    /**
     * @dev Get number of completed resales for a property
     */
    function getResaleCount(uint256 _propertyId) external view returns (uint256) {
        return resalePriceHistory[_propertyId].length;
    }

    // =========================================
    // VIEW FUNCTIONS - SHARES & LISTINGS
    // =========================================
    
    /**
     * @dev Get user's share balance for a property
     */
    function getUserShares(uint256 _propertyId, address _user) external view returns (uint256) {
        return userShares[_propertyId][_user];
    }
    
    /**
     * @dev Get all active resale listings for a property
     */
    function getActiveResaleListings(uint256 _propertyId) external view returns (uint256[] memory) {
        uint256[] storage allListings = propertyResaleListings[_propertyId];
        
        // Count active listings
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allListings.length; i++) {
            if (resaleListings[allListings[i]].isActive) {
                activeCount++;
            }
        }
        
        // Build active listings array
        uint256[] memory activeListings = new uint256[](activeCount);
        uint256 j = 0;
        for (uint256 i = 0; i < allListings.length; i++) {
            if (resaleListings[allListings[i]].isActive) {
                activeListings[j] = allListings[i];
                j++;
            }
        }
        
        return activeListings;
    }
    
    /**
     * @dev Get property details including pricing info
     */
    function getPropertyDetails(uint256 _propertyId) external view returns (
        uint256 id,
        uint256 initialPrice,
        uint256 currentPrice,
        uint256 totalShares,
        uint256 sharesSold,
        uint256 availableShares,
        address owner,
        bool isActive,
        string memory metadataURI
    ) {
        Property storage p = properties[_propertyId];
        return (
            p.id,
            p.initialPricePerShare,
            p.currentPrice,
            p.totalShares,
            p.sharesSold,
            p.totalShares - p.sharesSold,
            p.owner,
            p.isActive,
            p.metadataURI
        );
    }
}