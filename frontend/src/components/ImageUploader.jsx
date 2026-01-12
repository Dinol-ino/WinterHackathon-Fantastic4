// frontend/src/components/ImageUploader.jsx
import React, { useState, useRef } from 'react';

/**
 * ImageUploader Component
 * Upload multiple images with preview, minimum requirement, and drag-drop
 * 
 * @param {number} minImages - Minimum required images
 * @param {number} maxImages - Maximum allowed images
 * @param {Function} onImagesChange - Callback with array of {file, preview}
 */
const ImageUploader = ({
    minImages = 3,
    maxImages = 10,
    onImagesChange,
    initialImages = []
}) => {
    const [images, setImages] = useState(initialImages);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = (files) => {
        const newImages = [];
        const fileArray = Array.from(files);

        // Filter for image files only
        const imageFiles = fileArray.filter(file =>
            file.type.startsWith('image/')
        );

        // Check max limit
        const remainingSlots = maxImages - images.length;
        const filesToAdd = imageFiles.slice(0, remainingSlots);

        filesToAdd.forEach(file => {
            newImages.push({
                file: file,
                preview: URL.createObjectURL(file),
                name: file.name
            });
        });

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const removeImage = (index) => {
        const updatedImages = images.filter((_, i) => i !== index);
        setImages(updatedImages);
        onImagesChange(updatedImages);
    };

    const setMainImage = (index) => {
        // Move selected image to first position
        const updatedImages = [...images];
        const [selected] = updatedImages.splice(index, 1);
        updatedImages.unshift(selected);
        setImages(updatedImages);
        onImagesChange(updatedImages);
    };

    const isValid = images.length >= minImages;

    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                Property Images *
                <span style={{
                    fontWeight: 'normal',
                    color: isValid ? '#10b981' : '#ef4444',
                    marginLeft: '10px',
                    fontSize: '0.85rem'
                }}>
                    ({images.length}/{minImages} minimum)
                </span>
            </label>

            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragOver ? '#2563eb' : isValid ? '#10b981' : '#d1d5db'}`,
                    borderRadius: '12px',
                    padding: '30px',
                    textAlign: 'center',
                    backgroundColor: dragOver ? '#eff6ff' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📷</div>
                <p style={{ color: '#4b5563', marginBottom: '5px' }}>
                    Drag & drop images here, or click to select
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    Upload at least {minImages} images (max {maxImages})
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFiles(e.target.files)}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Validation Message */}
            {images.length > 0 && !isValid && (
                <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                }}>
                    ⚠️ Please upload at least {minImages} images. Currently: {images.length}
                </div>
            )}

            {/* Image Previews Grid */}
            {images.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '12px',
                    marginTop: '15px'
                }}>
                    {images.map((img, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                            <img
                                src={img.preview}
                                alt={`Preview ${index + 1}`}
                                style={{
                                    width: '100%',
                                    height: '100px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    border: index === 0 ? '3px solid #10b981' : '2px solid #e5e7eb'
                                }}
                            />

                            {/* Main image badge */}
                            {index === 0 && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    left: '5px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600'
                                }}>
                                    MAIN
                                </span>
                            )}

                            {/* Action buttons */}
                            <div style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                display: 'flex',
                                gap: '3px'
                            }}>
                                {index !== 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setMainImage(index)}
                                        title="Set as main image"
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            backgroundColor: '#2563eb',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        ★
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    title="Remove image"
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '10px' }}>
                First image will be used as the main display image
            </p>
        </div>
    );
};

export default ImageUploader;
