"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Scaffold-ETH 2</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <p className="text-center text-lg">
            Get started by editing{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/nextjs/app/page.tsx
            </code>
          </p>
          <p className="text-center text-lg">
            Edit your smart contract{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              YourContract.sol
            </code>{" "}
            in{" "}
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              packages/hardhat/contracts
            </code>
          </p>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary mb-3" />
              <h3 className="font-semibold mb-2">Debug Contracts</h3>
              <p className="text-sm text-base-content/70 mb-4">
                Tinker with your smart contracts and test functionality.
              </p>
              <Link href="/debug" className="btn btn-primary btn-sm">
                Open Debug
              </Link>
            </div>

            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary mb-3" />
              <h3 className="font-semibold mb-2">Block Explorer</h3>
              <p className="text-sm text-base-content/70 mb-4">Explore your local transactions and blockchain data.</p>
              <Link href="/blockexplorer" className="btn btn-primary btn-sm">
                Open Explorer
              </Link>
            </div>

            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <span className="text-4xl mb-3">🎨</span>
              <h3 className="font-semibold mb-2">NFT Marketplace</h3>
              <p className="text-sm text-base-content/70 mb-4">Browse and trade NFTs from various collections.</p>
              <Link href="/marketplace" className="btn btn-primary btn-sm">
                Open Marketplace
              </Link>
            </div>

            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <span className="text-4xl mb-3">📦</span>
              <h3 className="font-semibold mb-2">Create Collection</h3>
              <p className="text-sm text-base-content/70 mb-4">Create your own NFT collection with custom supply.</p>
              <Link href="/create-collection" className="btn btn-primary btn-sm">
                Create Collection
              </Link>
            </div>

            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <span className="text-4xl mb-3">✨</span>
              <h3 className="font-semibold mb-2">Mint NFT</h3>
              <p className="text-sm text-base-content/70 mb-4">Mint NFTs from existing collections.</p>
              <Link href="/mint" className="btn btn-primary btn-sm">
                Mint NFT
              </Link>
            </div>

            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <span className="text-4xl mb-3">👤</span>
              <h3 className="font-semibold mb-2">My Collections</h3>
              <p className="text-sm text-base-content/70 mb-4">View and manage your created collections.</p>
              <Link href="/my-collections" className="btn btn-primary btn-sm">
                View Collections
              </Link>
            </div>

            <div className="flex flex-col bg-base-100 px-6 py-8 text-center items-center rounded-3xl">
              <span className="text-4xl mb-3">🖼️</span>
              <h3 className="font-semibold mb-2">My NFTs</h3>
              <p className="text-sm text-base-content/70 mb-4">View and manage your owned NFTs.</p>
              <Link href="/my-nfts" className="btn btn-primary btn-sm">
                View My NFTs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
