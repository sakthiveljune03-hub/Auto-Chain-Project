// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CarAuction is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct Auction {
        address seller;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        bool isActive;
    }

    // Mapping from tokenId to Auction
    mapping(uint256 => Auction) public auctions;

    event CarListed(uint256 indexed tokenId, address indexed seller, uint256 startPrice);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount);

    constructor() ERC721("AutoChain", "AUTO") Ownable(msg.sender) {}

    // Mint a new Car NFT and start an auction
    function listCar(uint256 startPrice) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        auctions[tokenId] = Auction({
            seller: msg.sender,
            startPrice: startPrice,
            highestBid: 0,
            highestBidder: address(0),
            isActive: true
        });

        emit CarListed(tokenId, msg.sender, startPrice);
        return tokenId;
    }

    // Place a bid on a specific car auction
    function placeBid(uint256 tokenId) external payable {
        Auction storage auction = auctions[tokenId];
        require(auction.isActive, "Auction is not active");
        require(msg.value > auction.highestBid, "Bid must be higher than current highest bid");
        require(msg.value >= auction.startPrice, "Bid must be at least the start price");
        require(msg.sender != auction.seller, "Seller cannot bid on their own car");

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    // End the auction and transfer the car NFT to the winner, and funds to the seller
    function endAuction(uint256 tokenId) external {
        Auction storage auction = auctions[tokenId];
        require(auction.isActive, "Auction is already ended");
        require(msg.sender == auction.seller || msg.sender == owner(), "Only seller or owner can end");

        auction.isActive = false;

        if (auction.highestBidder != address(0)) {
            // Transfer funds to the seller
            payable(auction.seller).transfer(auction.highestBid);
            // Transfer the NFT to the winner
            _transfer(auction.seller, auction.highestBidder, tokenId);
            
            emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
        } else {
            // No bids received
            emit AuctionEnded(tokenId, address(0), 0);
        }
    }
}
