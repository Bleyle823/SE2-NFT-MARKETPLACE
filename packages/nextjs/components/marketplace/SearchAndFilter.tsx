"use client";

import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { useState } from "react";

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  categories: Array<{ id: string; name: string }>;
  sortOptions: Array<{ value: string; label: string }>;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export const SearchAndFilter = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  categories,
  sortOptions,
  showFilters = true,
  onToggleFilters
}: SearchAndFilterProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleToggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
    onToggleFilters?.();
  };

  const clearFilters = () => {
    onSearchChange("");
    onCategoryChange("all");
    onSortChange("date");
  };

  const hasActiveFilters = searchTerm || selectedCategory !== "all" || sortBy !== "date";

  return (
    <div className="bg-base-100 rounded-2xl shadow-lg p-6 mb-8">
      {/* Main Search Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
            <input
              type="text"
              placeholder="Search events, venues, or tags..."
              className="input input-bordered w-full pl-10 pr-10"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50 hover:text-base-content"
                onClick={() => onSearchChange("")}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="lg:w-48">
          <select
            className="select select-bordered w-full"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="lg:w-48">
          <select
            className="select select-bordered w-full"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Toggle */}
        {showFilters && (
          <button
            className="btn btn-outline lg:hidden"
            onClick={handleToggleFilters}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {isFiltersOpen && (
        <div className="mt-6 pt-6 border-t border-base-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Price Range</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="input input-bordered input-sm flex-1"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="input input-bordered input-sm flex-1"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Date Range</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                />
                <input
                  type="date"
                  className="input input-bordered input-sm flex-1"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Event Type</span>
              </label>
              <select className="select select-bordered select-sm">
                <option>All Types</option>
                <option>Virtual</option>
                <option>In-Person</option>
                <option>Hybrid</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Availability</span>
              </label>
              <select className="select select-bordered select-sm">
                <option>All Events</option>
                <option>Available Now</option>
                <option>Almost Sold Out</option>
                <option>Sold Out</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-base-content/70">Active filters:</span>
          {searchTerm && (
            <span className="badge badge-primary">
              Search: {searchTerm}
              <button
                className="ml-1"
                onClick={() => onSearchChange("")}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedCategory !== "all" && (
            <span className="badge badge-secondary">
              Category: {categories.find(c => c.id === selectedCategory)?.name}
              <button
                className="ml-1"
                onClick={() => onCategoryChange("all")}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          {sortBy !== "date" && (
            <span className="badge badge-accent">
              Sort: {sortOptions.find(s => s.value === sortBy)?.label}
              <button
                className="ml-1"
                onClick={() => onSortChange("date")}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            className="btn btn-ghost btn-xs"
            onClick={clearFilters}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
