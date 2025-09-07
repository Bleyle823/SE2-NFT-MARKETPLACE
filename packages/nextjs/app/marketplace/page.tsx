"use client";

import React, { useState } from "react";
import { NFTMarketplaceGrid } from "~~/components/marketplace/NFTMarketplaceGrid";

// // import { LoadingSpinner } from "~~/components/marketplace/LoadingSpinner";

export default function MarketplacePage() {
  const [filters, setFilters] = useState({
    priceRange: [0, 100] as [number, number],
    collection: "all",
    sortBy: "recentlyListed",
    searchQuery: "",
  });

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-base-content mb-4">NFT Marketplace</h1>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Discover, buy, and sell unique NFTs. Browse through our collection of digital art and collectibles.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-base-100 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Price Range (ETH)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange[0]}
                  onChange={e =>
                    handleFilterChange({
                      priceRange: [parseFloat(e.target.value) || 0, filters.priceRange[1]],
                    })
                  }
                  className="input input-bordered input-sm w-full"
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange[1]}
                  onChange={e =>
                    handleFilterChange({
                      priceRange: [filters.priceRange[0], parseFloat(e.target.value) || 100],
                    })
                  }
                  className="input input-bordered input-sm w-full"
                />
              </div>
            </div>

            {/* Collection */}
            <div>
              <label className="block text-sm font-medium mb-2">Collection</label>
              <select
                value={filters.collection}
                onChange={e => handleFilterChange({ collection: e.target.value })}
                className="select select-bordered select-sm w-full"
              >
                <option value="all">All Collections</option>
                <option value="myToken">MyToken Collection</option>
                <option value="nftCollection">NFT Collections</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={e => handleFilterChange({ sortBy: e.target.value })}
                className="select select-bordered select-sm w-full"
              >
                <option value="recentlyListed">Recently Listed</option>
                <option value="priceLowToHigh">Price: Low to High</option>
                <option value="priceHighToLow">Price: High to Low</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by token ID or seller..."
                value={filters.searchQuery}
                onChange={e => handleFilterChange({ searchQuery: e.target.value })}
                className="input input-bordered input-sm w-full"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() =>
                setFilters({
                  priceRange: [0, 100],
                  collection: "all",
                  sortBy: "recentlyListed",
                  searchQuery: "",
                })
              }
              className="btn btn-outline btn-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* NFT Grid */}
        <NFTMarketplaceGrid filters={filters} />
      </div>
    </div>
  );
}
