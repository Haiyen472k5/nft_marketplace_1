// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard, AccessControl {
    // ROLES
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // Variables
    address payable public immutable feeAccount;
    uint public feePercent;
    uint public itemCount;
    uint public offerCount;
    bool public paused;

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable issuer;
        address payable currentOwner;
        bool sold;
        bool cancelled; // [FIX] Sửa chính tả từ canceled -> cancelled (2 chữ l)
        bool isUsed;
        ItemType itemType;
    }

    struct Offer {
        uint offerId;
        uint itemId;
        address payable buyer;
        uint price;
        bool accepted;
        bool cancelled;
    }

    struct IssuerInfo {
        string name; // Business name
        string description; // Business description
        bool isActive; // Can create new items
        uint totalItemsCreated;
        uint totalSales;
    }

    enum ItemType {
        TICKET,
        VOUCHER,
        MEMBERSHIP
    }

    // MAPPINGS
    mapping(uint => Item) public items;
    mapping(uint => Offer) public offers;
    
    // itemId => offerId[]
    mapping(uint => uint[]) public itemOffers;
    mapping(address => IssuerInfo) public issuers;

    // Events
    event IssuerAdded(address indexed issuer, string name);
    event IssuerRemoved(address indexed issuer);
    event IssuerUpdated(address indexed issuer, string name, bool isActive);

    event ItemCreated(
        uint itemId,
        address indexed nft,
        uint tokenId, // [FIX] Thêm tokenId vào đây để khớp với lệnh emit (7 tham số)
        uint price,
        address indexed issuer,
        ItemType itemType
    );

    event ItemSold(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed issuer,
        address indexed buyer
    );


    event ItemCancelled(uint itemId, address indexed issuer);
    event ItemRedeemed(uint itemId, address indexed issuer, address indexed owner);

    event OfferMade(uint offerId, uint itemId, address indexed buyer, uint price);
    event OfferAccepted(uint offerId, uint itemId, address indexed seller, address indexed buyer, uint price);
    event OfferCancelled(uint offerId, uint itemId, address indexed buyer);

    event MarketplacePaused(bool isPaused);
    event FeePercentUpdated(uint newFeePercent);
    
    // MODIFIERS
    modifier onlyIssuer() {
        require(hasRole(ISSUER_ROLE, msg.sender), "Must be authorized issuer");
        require(issuers[msg.sender].isActive, "Issuer account is inactive");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Marketplace is paused");
        _;
    }

    modifier itemExists(uint _itemId) {
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        _;
    }

    // constructor
    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
        paused = false;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // admin functions
    function addIssuer(
        address _issuer,
        string memory _name,
        string memory _description
    ) external onlyRole(ADMIN_ROLE) {
        require(_issuer != address(0), "Invalid issuer address");
        require(!hasRole(ISSUER_ROLE, _issuer), "Already an issuer");
        
        _grantRole(ISSUER_ROLE, _issuer);
        
        issuers[_issuer] = IssuerInfo({
            name: _name,
            description: _description,
            isActive: true,
            totalItemsCreated: 0,
            totalSales: 0
        });
        emit IssuerAdded(_issuer, _name);
    }

    function removeIssuer(address _issuer) external onlyRole(ADMIN_ROLE) {
        require(hasRole(ISSUER_ROLE, _issuer), "Not an issuer");
        _revokeRole(ISSUER_ROLE, _issuer);
        issuers[_issuer].isActive = false;
        
        emit IssuerRemoved(_issuer);
    }

    function updateIssuer(
        address _issuer,
        string memory _name,
        string memory _description,
        bool _isActive
    ) external onlyRole(ADMIN_ROLE) {
        require(hasRole(ISSUER_ROLE, _issuer), "Not an issuer");
        issuers[_issuer].name = _name;
        issuers[_issuer].description = _description;
        issuers[_issuer].isActive = _isActive;
        
        emit IssuerUpdated(_issuer, _name, _isActive);
    }

    function setPaused(bool _paused) external onlyRole(ADMIN_ROLE) {
        paused = _paused;
        emit MarketplacePaused(_paused);
    }

    function setFeePercent(uint _feePercent) external onlyRole(ADMIN_ROLE) {
        require(_feePercent <= 10, "Fee too high");
        // Max 10%
        feePercent = _feePercent;
        emit FeePercentUpdated(_feePercent);
    }

    // issuer functions

    function createItem(
        IERC721 _nft,
        uint _tokenId,
        uint _price,
        ItemType _itemType
    ) external onlyIssuer whenNotPaused nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        
        
        itemCount++;
        // Transfer NFT to marketplace
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // Create item
        items[itemCount] = Item({
            itemId: itemCount,
            nft: _nft,
            tokenId: _tokenId,
            price: _price,
            issuer: payable(msg.sender),
            currentOwner: payable(msg.sender),
            sold: false,
            cancelled: false, // [FIX] Khớp với struct Item đã sửa
            isUsed: false,
            itemType: _itemType
        });
        // Update issuer stats
        issuers[msg.sender].totalItemsCreated++;
        emit ItemCreated(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender,
            _itemType
        );
    }

    function redeemItem(uint _itemId) external nonReentrant itemExists(_itemId) {
        Item storage item = items[_itemId];

        // Chỉ có Issuer tạo ra vé đó (hoặc Admin) mới được quyền soát vé
        require(msg.sender == item.issuer || hasRole(ADMIN_ROLE, msg.sender), "Caller cannot redeem this item");
        
        require(!item.isUsed, "Item already used/redeemed");
        require(!item.cancelled, "Item is cancelled");

        // Đánh dấu đã sử dụng
        item.isUsed = true;

        emit ItemRedeemed(_itemId, msg.sender, item.currentOwner);
    }

    function cancelItem(uint _itemId) 
        external 
        onlyIssuer 
        itemExists(_itemId) 
        nonReentrant 
    {
        Item storage item = items[_itemId];
        require(item.issuer == msg.sender, "Not the issuer");
        require(!item.sold, "Item already sold");
        require(!item.cancelled, "Item already cancelled");
        require(!item.isUsed, "Item already used");

        item.cancelled = true;
        // Return NFT to issuer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        // Refund all offers
        _refundAllOffers(_itemId);
        
        emit ItemCancelled(_itemId, msg.sender);
    }

    // buyer functions

    function purchaseItem(uint _itemId) 
        external 
        payable 
        whenNotPaused
        itemExists(_itemId)
        nonReentrant 
    {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        
        require(msg.value >= _totalPrice, "Insufficient payment");
        require(!item.sold, "Item already sold");
        require(!item.cancelled, "Item cancelled");
        require(!item.isUsed, "Item already used");
        require(msg.sender != item.currentOwner, "Cannot buy your own item");
        
        
        // Calculate payments
        uint fee = (_totalPrice * feePercent) / 100;
        uint sellerAmount = _totalPrice - fee;
        
        // Transfer payments
        item.currentOwner.transfer(sellerAmount);
        feeAccount.transfer(fee);
        // Update item
        item.sold = true;
        item.currentOwner = payable(msg.sender);


        issuers[item.issuer].totalSales++;

        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        // Refund other offers
        _refundAllOffers(_itemId);
        emit ItemSold(
            _itemId,
            address(item.nft),
            item.tokenId,
            _totalPrice,
            item.issuer,
            msg.sender
        );
    }

    // offer functions

    // [FIX] Đã xóa các khai báo Event trùng lặp ở đây (OfferMade, OfferAccepted, OfferCancelled)

    // Make an offer on an item
    function makeOffer(uint _itemId) 
        external 
        payable 
        whenNotPaused
        itemExists(_itemId)
        nonReentrant  
    {
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(!item.sold, "item already sold");
        require(!item.isUsed, "Item already used");
        require(msg.sender != item.currentOwner, "Cannot offer on your own item");
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
        require(msg.sender == item.currentOwner, "Only seller can accept offers");
        require(!item.isUsed, "Item already used");
        require(!item.sold, "Item already sold");
        require(!offer.accepted, "Offer already accepted");

        require(!offer.cancelled, "Offer was cancelled");
        
        // Calculate fee
        uint fee = (offer.price * feePercent) / 100;
        uint sellerAmount = offer.price - fee;
        
        // Transfer payments
        item.currentOwner.transfer(sellerAmount);
        feeAccount.transfer(fee);
        
        // Mark offer as accepted and item as sold
        offer.accepted = true;
        item.sold = true;
        item.currentOwner = offer.buyer;

        issuers[item.issuer].totalSales++;

        // Transfer NFT to buyer
        item.nft.transferFrom(address(this), offer.buyer, item.tokenId);
        // Refund other offers for this item
        _refundOtherOffers(offer.itemId, _offerId);
        
        emit OfferAccepted(
            _offerId,
            offer.itemId,
            msg.sender, // [FIX] Sửa item.sender thành msg.sender
            offer.buyer,
            offer.price
        );
        emit ItemSold(
            item.itemId,
            address(item.nft),
            item.tokenId,
            offer.price,
            item.issuer,
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
        // [FIX] Xóa 1 dòng transfer bị lặp lại ở đây
        offer.buyer.transfer(offer.price);
        
        emit OfferCancelled(
            _offerId,
            offer.itemId,
            offer.buyer
        );
    }

    // Internal function to refund other offers when one is accepted

    function _refundAllOffers(uint _itemId) internal {
        uint[] memory offerIds = itemOffers[_itemId];
        for (uint i = 0; i < offerIds.length; i++) {
            Offer storage offer = offers[offerIds[i]];
            if (!offer.cancelled && !offer.accepted) {
                offer.cancelled = true;
                offer.buyer.transfer(offer.price);
            }
        }
    }

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

    function getIssuerInfo(address _issuer) external view returns (
        string memory name,
        string memory description,
        bool isActive,
        uint totalItemsCreated,
        uint totalSales
    ) {
        IssuerInfo storage info = issuers[_issuer];
        return (
            info.name,
            info.description,
            info.isActive,
            info.totalItemsCreated,
            info.totalSales
        );
    }

    function isAuthorizedIssuer(address _address) external view returns (bool) {
        return hasRole(ISSUER_ROLE, _address) && issuers[_address].isActive;
    }
}