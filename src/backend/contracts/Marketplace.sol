// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard {

    // Variables
    address payable public immutable feeAccount;
    uint public immutable feePercent;
    uint public itemCount;
    uint public offerCount;

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    struct Offer {
        uint offerId;
        uint itemId;
        address payable buyer;
        uint price;
        bool accepted;
        bool cancelled;
    }

    mapping(uint => Item) public items;
    mapping(uint => Offer) public offers;
    
    // itemId => offerId[]
    mapping(uint => uint[]) public itemOffers;

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    event OfferMade(
        uint offerId,
        uint itemId,
        address indexed buyer,
        uint price
    );

    event OfferAccepted(
        uint offerId,
        uint itemId,
        address indexed seller,
        address indexed buyer,
        uint price
    );

    event OfferCancelled(
        uint offerId,
        uint itemId,
        address indexed buyer
    );

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    // Make item to offer on the marketplace
    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        itemCount++;
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        
        items[itemCount] = Item(
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
        
        emit Offered(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender
        );
    }

    // Direct purchase at listing price
    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(msg.value >= _totalPrice, "not enough ether to cover item price and market fee");
        require(!item.sold, "item already sold");
        require(msg.sender != item.seller, "Cannot buy your own item");
        
        // Pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);
        
        // Update item to sold
        item.sold = true;
        
        // Transfer NFT to buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    // Make an offer on an item
    function makeOffer(uint _itemId) external payable nonReentrant {
        Item storage item = items[_itemId];
        
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(!item.sold, "item already sold");
        require(msg.sender != item.seller, "Cannot offer on your own item");
        require(msg.value > 0, "Offer price must be greater than zero");
        
        offerCount++;
        
        offers[offerCount] = Offer(
            offerCount,
            _itemId,
            payable(msg.sender),
            msg.value,
            false,
            false
        );
        
        itemOffers[_itemId].push(offerCount);
        
        emit OfferMade(
            offerCount,
            _itemId,
            msg.sender,
            msg.value
        );
    }

    // Accept an offer (seller only)
    function acceptOffer(uint _offerId) external nonReentrant {
        Offer storage offer = offers[_offerId];
        Item storage item = items[offer.itemId];
        
        require(msg.sender == item.seller, "Only seller can accept offers");
        require(!item.sold, "Item already sold");
        require(!offer.accepted, "Offer already accepted");
        require(!offer.cancelled, "Offer was cancelled");
        
        // Calculate fee
        uint fee = (offer.price * feePercent) / 100;
        uint sellerAmount = offer.price - fee;
        
        // Transfer payments
        item.seller.transfer(sellerAmount);
        feeAccount.transfer(fee);
        
        // Mark offer as accepted and item as sold
        offer.accepted = true;
        item.sold = true;
        
        // Transfer NFT to buyer
        item.nft.transferFrom(address(this), offer.buyer, item.tokenId);
        
        // Refund other offers for this item
        _refundOtherOffers(offer.itemId, _offerId);
        
        emit OfferAccepted(
            _offerId,
            offer.itemId,
            item.seller,
            offer.buyer,
            offer.price
        );

        emit Bought(
            offer.itemId,
            address(item.nft),
            item.tokenId,
            offer.price,
            item.seller,
            offer.buyer
        );
    }

    // Cancel an offer (buyer only)
    function cancelOffer(uint _offerId) external nonReentrant {
        Offer storage offer = offers[_offerId];
        
        require(msg.sender == offer.buyer, "Only buyer can cancel their offer");
        require(!offer.accepted, "Offer already accepted");
        require(!offer.cancelled, "Offer already cancelled");
        
        offer.cancelled = true;
        
        // Refund the buyer
        offer.buyer.transfer(offer.price);
        
        emit OfferCancelled(
            _offerId,
            offer.itemId,
            offer.buyer
        );
    }

    // Internal function to refund other offers when one is accepted
    function _refundOtherOffers(uint _itemId, uint _acceptedOfferId) internal {
        uint[] memory offerIds = itemOffers[_itemId];
        
        for (uint i = 0; i < offerIds.length; i++) {
            uint offerId = offerIds[i];
            Offer storage offer = offers[offerId];
            
            // Skip the accepted offer and already cancelled offers
            if (offerId != _acceptedOfferId && !offer.cancelled && !offer.accepted) {
                offer.cancelled = true;
                offer.buyer.transfer(offer.price);
            }
        }
    }

    // Get all offers for an item
    function getItemOffers(uint _itemId) external view returns (uint[] memory) {
        return itemOffers[_itemId];
    }

    // Get offer details
    function getOffer(uint _offerId) external view returns (
        uint offerId,
        uint itemId,
        address buyer,
        uint price,
        bool accepted,
        bool cancelled
    ) {
        Offer storage offer = offers[_offerId];
        return (
            offer.offerId,
            offer.itemId,
            offer.buyer,
            offer.price,
            offer.accepted,
            offer.cancelled
        );
    }

    function getTotalPrice(uint _itemId) view public returns(uint) {
        return((items[_itemId].price * (100 + feePercent)) / 100);
    }
}