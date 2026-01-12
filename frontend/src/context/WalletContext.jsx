// src/context/WalletContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Ref to track if a connection is in progress (prevents double requests)
    const isConnectingRef = useRef(false);

    // Polygon Amoy Testnet Chain ID
    const AMOY_CHAIN_ID = '0x13882'; // 80002 in hex

    const switchToAmoy = async () => {
        if (!window.ethereum) return;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: AMOY_CHAIN_ID }],
            });
            return true;
        } catch (switchError) {
            // Chain not added (4902) or user rejected (4001)
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: AMOY_CHAIN_ID,
                            chainName: 'Polygon Amoy Testnet',
                            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                            rpcUrls: ['https://rpc-amoy.polygon.technology'],
                            blockExplorerUrls: ['https://amoy.polygonscan.com/']
                        }],
                    });
                    return true;
                } catch (addError) {
                    console.error('Failed to add Amoy network:', addError);
                    return false;
                }
            }
            return false;
        }
    };

    const connectWallet = async () => {
        // Prevent multiple simultaneous connection requests
        if (isConnectingRef.current || connecting) {
            console.log('Connection already in progress, please wait...');
            return;
        }

        if (!window.ethereum) {
            setError('MetaMask not detected. Please install MetaMask extension.');
            alert('Please install MetaMask!');
            return;
        }

        isConnectingRef.current = true;
        setConnecting(true);
        setError(null);

        try {
            // Request account access using eth_requestAccounts (simpler, less prone to pending issues)
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask.');
            }

            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const walletSigner = await browserProvider.getSigner();
            const address = await walletSigner.getAddress();
            const network = await browserProvider.getNetwork();

            setProvider(browserProvider);
            setSigner(walletSigner);
            setAccount(address);
            setChainId(network.chainId.toString());

            console.log('Wallet connected:', address);

            // Optional: Switch to Amoy if not already on it (don't block on this)
            if (network.chainId !== 80002n) {
                switchToAmoy().catch(console.error);
            }

            return address;

        } catch (err) {
            console.error('Wallet connection failed:', err);

            // Handle specific error codes
            let errorMessage = 'Failed to connect wallet';
            if (err.code === 4001) {
                errorMessage = 'Connection rejected by user';
            } else if (err.code === -32002) {
                errorMessage = 'MetaMask is already processing a request. Please check the MetaMask popup.';
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            // Don't show alert for "already pending" - just log it
            if (err.code !== -32002) {
                alert(errorMessage);
            }
            return null;

        } finally {
            isConnectingRef.current = false;
            setConnecting(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setChainId(null);
        setError(null);
    };

    // Check if wallet is already connected on load
    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum) {
                try {
                    // Use eth_accounts (not requestAccounts) to check existing connection
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

                    if (accounts.length > 0) {
                        const browserProvider = new ethers.BrowserProvider(window.ethereum);
                        const walletSigner = await browserProvider.getSigner();
                        const network = await browserProvider.getNetwork();

                        setProvider(browserProvider);
                        setSigner(walletSigner);
                        setAccount(accounts[0]);
                        setChainId(network.chainId.toString());
                    }
                } catch (err) {
                    console.error('Error checking wallet connection:', err);
                }
            }
            setLoading(false);
        };

        checkConnection();

        // Listen for account changes
        const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                // Refresh signer
                if (window.ethereum) {
                    const browserProvider = new ethers.BrowserProvider(window.ethereum);
                    browserProvider.getSigner().then(setSigner).catch(console.error);
                }
            } else {
                disconnectWallet();
            }
        };

        const handleChainChanged = (newChainId) => {
            setChainId(parseInt(newChainId, 16).toString());
            // Refresh provider and signer
            if (window.ethereum && account) {
                const browserProvider = new ethers.BrowserProvider(window.ethereum);
                setProvider(browserProvider);
                browserProvider.getSigner().then(setSigner).catch(console.error);
            }
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, [account]);

    return (
        <WalletContext.Provider value={{
            account,
            provider,
            signer,
            chainId,
            connectWallet,
            disconnectWallet,
            switchToAmoy,
            loading,
            connecting,
            error,
            isConnected: !!account,
            isAmoy: chainId === '80002'
        }}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletContext;
