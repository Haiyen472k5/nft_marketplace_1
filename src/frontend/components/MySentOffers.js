import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap'
import { Link } from "react-router-dom"

export default function MySentOffers({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [myOffers, setMyOffers] = useState([])
  const [error, setError] = useState(null)

  const loadMySentOffers = async () => {
    try {
      setError(null)
      if (!marketplace.address || !nft.address || !account) {
        throw new Error("Not connected")
      }

      // 1. Lấy tất cả sự kiện OfferCancelled của user hiện tại (Load 1 lần duy nhất)
      // Filter: OfferCancelled(offerId, itemId, buyer) -> buyer = account
      const filter = marketplace.filters.OfferCancelled(null, null, account);
      const events = await marketplace.queryFilter(filter);
      
      // Tạo một Set chứa các offerId đã được user tự tay hủy (có sự kiện)
      const manualCancelledOfferIds = new Set();
      events.forEach(event => {
          manualCancelledOfferIds.add(event.args.offerId.toString());
      });

      const offerCount = await marketplace.offerCount()
      let sentOffers = []

      for (let i = 1; i <= offerCount; i++) {
        const offer = await marketplace.getOffer(i)
        
        // Chỉ xử lý offer của mình
        if (offer.buyer.toLowerCase() === account.toLowerCase()) {
          
          let shouldShow = false;

          // TH1: Offer đang Active
          if (!offer.cancelled && !offer.accepted) {
            shouldShow = true;
          }
          // TH2: Offer đã bị hủy (cancelled == true)
          else if (offer.cancelled) {
             // Kiểm tra xem ID này có nằm trong danh sách "Tự tay hủy" không?
             const isManualCancel = manualCancelledOfferIds.has(offer.offerId.toString());

             if (isManualCancel) {
                 // Có sự kiện => Mình tự hủy => ẨN
                 shouldShow = false; 
             } else {
                 // Không có sự kiện => Hệ thống tự hủy (do Sold) => HIỆN
                 shouldShow = true;
             }
          }

          if (shouldShow) {
            // Lấy thông tin chi tiết item
            const item = await marketplace.items(offer.itemId)
            const uri = await nft.tokenURI(item.tokenId)
            const response = await fetch(uri)
            const metadata = await response.json()
            const listingPrice = await marketplace.getTotalPrice(offer.itemId)

            sentOffers.push({
              offerId: offer.offerId.toNumber(),
              itemId: offer.itemId.toNumber(),
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              offerPrice: offer.price,
              offerPriceFormatted: ethers.utils.formatEther(offer.price),
              listingPrice: listingPrice,
              listingPriceFormatted: ethers.utils.formatEther(listingPrice),
              seller: item.currentOwner,
              sold: item.sold,       
              cancelled: offer.cancelled 
            })
          }
        }
      }

      setMyOffers(sentOffers.reverse())
      setLoading(false)
    } catch (error) {
      console.error("Error loading sent offers:", error)
      setLoading(false)
      setError("Failed to load your offers. Please try again.")
    }
  }

  // --- Hàm Cancel giữ nguyên ---
  const cancelOffer = async (offerId, itemName, offerPrice) => {
    try {
      const confirmed = window.confirm(
        `Cancel your offer of ${offerPrice} ETH for "${itemName}"?\n\nYour ETH will be refunded immediately.`
      )
      if (!confirmed) return
      const tx = await marketplace.cancelOffer(offerId)
      alert("⏳ Cancelling offer...")
      await tx.wait()
      alert("✅ Offer cancelled!")
      loadMySentOffers()
    } catch (error) {
      console.error("Error cancelling:", error)
      alert("Error: " + (error.reason || error.message))
    }
  }

  useEffect(() => {
    loadMySentOffers()
  }, [marketplace.address, nft.address, account])

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
  if (error) return <Alert variant="danger" className="m-5">{error}</Alert>

  return (
    <div className="container px-4 py-5">
      <div className="d-flex align-items-center mb-4">
        <h2 className="fw-bold mb-0">📤 Offers You Made</h2>
        <Badge bg="primary" className="ms-3 fs-6 rounded-pill">
          {myOffers.length} Active/History
        </Badge>
      </div>

      {myOffers.length === 0 ? (
        <Alert variant="info" className="text-center py-5 shadow-sm">
          <h4>No Active Offers</h4>
          <p className="text-muted">Offers you voluntarily cancel are hidden.</p>
          <Button as={Link} to="/home" variant="primary">Explore Marketplace</Button>
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} xl={4} className="g-4">
          {myOffers.map((offer, idx) => {
            const percentOfListing = (parseFloat(offer.offerPriceFormatted) / parseFloat(offer.listingPriceFormatted) * 100).toFixed(0);
            
            // Xác định trạng thái để hiển thị Badge
            let overlayBadge = null;
            
            // Nếu đã bị hủy (mà vẫn được hiển thị) -> Chắc chắn là do hệ thống hủy (Sold out)
            // Hoặc item.sold = true
            if (offer.cancelled || offer.sold) {
                overlayBadge = (
                  <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center" 
                       style={{background: 'rgba(0,0,0,0.6)', zIndex: 5}}>
                     <span className="badge bg-secondary fs-5 px-3 py-2 shadow border">
                        {offer.sold ? "ITEM SOLD" : "OFFER EXPIRED"}
                     </span>
                  </div>
                )
            }

            return (
              <Col key={idx}>
                <Card className="h-100 nft-card shadow-sm border-0">
                  <div className="nft-image-container position-relative" style={{overflow: 'hidden', borderRadius: '12px 12px 0 0'}}>
                    {overlayBadge}
                    
                    <img 
                      src={offer.image} 
                      alt={offer.name}
                      style={{ 
                        width: '100%', 
                        height: '220px', 
                        objectFit: 'cover',
                        filter: (offer.cancelled || offer.sold) ? 'grayscale(100%)' : 'none' 
                      }}
                    />
                     <span className="position-absolute top-0 end-0 badge bg-info m-2">
                      {percentOfListing}% of Listing
                    </span>
                  </div>

                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="fw-bold text-truncate" style={{maxWidth: '70%'}}>
                        {offer.name}
                      </Card.Title>
                      <small className="text-muted">#{offer.itemId}</small>
                    </div>

                    <Card.Text className="d-flex justify-content-between align-items-start mb-2">
                      Description: {offer.description || "No description available"}
                    </Card.Text>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="p-2 bg-light rounded text-center">
                            <small className="d-block text-muted">Listing</small>
                            <span className="fw-bold">{Number(offer.listingPriceFormatted).toFixed(3)}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded text-center">
                            <small className="d-block text-primary">Your Offer</small>
                            <span className="fw-bold text-dark">{Number(offer.offerPriceFormatted).toFixed(3)}</span>
                        </div>
                      </div>
                    </div>

                    <Card.Footer className="bg-white border-top-0 pt-0 pb-3">
                      <div className="d-flex align-items-center justify-content-center p-2 rounded bg-light">
                        <small className="text-muted me-2">Seller:</small>
                        <small className="font-monospace text-dark fw-bold">
                          {offer.seller.slice(0, 6)}...{offer.seller.slice(-4)}
                        </small>
                      </div>
                    </Card.Footer>

                    <div className="mt-auto">
                      {(offer.cancelled || offer.sold) ? (
                        <Button variant="secondary" disabled className="w-100">
                           🚫 Closed
                        </Button>
                      ) : (
                        <Button 
                          variant="outline-danger" 
                          className="w-100"
                          onClick={() => cancelOffer(offer.offerId, offer.name, offer.offerPriceFormatted)}
                        >
                          Cancel Offer
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  );
}
