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

      const offerCount = await marketplace.offerCount()
      let sentOffers = []

      for (let i = 1; i <= offerCount; i++) {
        const offer = await marketplace.getOffer(i)
        
        // Only get offers made by current user that are still active
        if (offer.buyer.toLowerCase() === account.toLowerCase()) {
          
          // Get item details
          const item = await marketplace.items(offer.itemId)

          const isActive = !offer.accepted && !offer.cancelled;
          const isSoldOut = offer.cancelled && item.sold;
          if (isActive || isSoldOut) {
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
              sold: item.sold
            })
          }
        }
      }

      setMyOffers(sentOffers)
      setLoading(false)
    } catch (error) {
      console.error("Error loading sent offers:", error)
      setLoading(false)
      setError("Failed to load your offers. Please try again.")
    }
  }

  const cancelOffer = async (offerId, itemName, offerPrice) => {
    try {
      const confirmed = window.confirm(
        `Cancel your offer of ${offerPrice} ETH for "${itemName}"?\n\nYour ETH will be refunded immediately.`
      )

      if (!confirmed) return

      const tx = await marketplace.cancelOffer(offerId)
      alert("⏳ Cancelling offer...")
      await tx.wait()
      alert("✅ Offer cancelled! Your ETH has been refunded.")
      
      // Reload data
      loadMySentOffers()
    } catch (error) {
      console.error("Error cancelling offer:", error)
      if (error.code === 4001) {
        alert("❌ Transaction cancelled")
      } else {
        alert("❌ Failed to cancel offer: " + (error.reason || error.message))
      }
    }
  }

  useEffect(() => {
    loadMySentOffers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketplace.address, nft.address, account])

  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading your offers...</p>
      </div>
    </main>
  )

  if (error) return (
    <main style={{ padding: "2rem" }}>
      <Alert variant="danger">
        <Alert.Heading>❌ Error</Alert.Heading>
        <p>{error}</p>
        <hr />
        <Button onClick={() => window.location.reload()} variant="outline-danger">
          🔄 Reload
        </Button>
      </Alert>
    </main>
  )

return (
    <div className="container px-4 py-5">
      <div className="d-flex align-items-center mb-4">
        <h2 className="fw-bold mb-0">📤 Offers You Made</h2>
        <Badge bg="primary" className="ms-3 fs-6 rounded-pill">
          {myOffers.length} Active
        </Badge>
      </div>

      {myOffers.length === 0 ? (
        <Alert variant="info" className="text-center py-5 shadow-sm border-0 rounded-3">
          <div className="display-1 mb-3">💸</div>
          <h4>No Active Offers</h4>
          <p className="text-muted">You haven't made any offers yet.</p>
          <Button as={Link} to="/home" variant="primary" size="lg" className="mt-3 px-4 rounded-pill">
            Explore Marketplace
          </Button>
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} xl={4} className="g-4">
          {myOffers.map((offer, idx) => {
            // Tính phần trăm chênh lệch
            const percentOfListing = (parseFloat(offer.offerPriceFormatted) / parseFloat(offer.listingPriceFormatted) * 100).toFixed(0);
            
            // Xác định màu sắc dựa trên mức giá offer
            let badgeColor = 'secondary';
            if (percentOfListing >= 100) badgeColor = 'success';
            else if (percentOfListing >= 80) badgeColor = 'info';
            else if (percentOfListing >= 50) badgeColor = 'warning';

            return (
              <Col key={idx}>
                <Card className="h-100 nft-card">
                  {/* --- PHẦN HÌNH ẢNH --- */}
                  <div className="nft-image-container">
                    {offer.sold && (
                      <div className="position-absolute w-100 h-100 d-flex align-items-center justify-content-center" 
                           style={{background: 'rgba(0,0,0,0.5)', zIndex: 5}}>
                        <span className="badge bg-danger fs-5 px-3 py-2 shadow">SOLD OUT</span>
                      </div>
                    )}
                    
                    <img 
                      src={offer.image} 
                      alt={offer.name}
                      className="nft-image"
                      style={{ filter: offer.sold ? 'grayscale(100%)' : 'none' }}
                    />
                    
                    {/* Badge % Listing Price */}
                    <span className={`status-badge bg-${badgeColor} text-white`}>
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
                    
                    <Card.Text className="text-muted small text-truncate mb-3">
                      {offer.description || "No description available"}
                    </Card.Text>

                    {/* --- SO SÁNH GIÁ (GRID) --- */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="price-box">
                          <div className="offer-label">Listing Price</div>
                          <div className="price-value text-muted">
                            {Number(offer.listingPriceFormatted).toFixed(3)} <small>ETH</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="price-box border border-primary border-opacity-25 bg-primary bg-opacity-10">
                          <div className="offer-label text-primary">Your Offer</div>
                          <div className="price-value highlight">
                            {Number(offer.offerPriceFormatted).toFixed(3)} <small>ETH</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      {offer.sold ? (
                        <Button variant="secondary" disabled className="w-100 rounded-pill">
                          Item Sold
                        </Button>
                      ) : (
                        <div className="d-grid gap-2">
                          <Button 
                            variant="outline-danger" 
                            className="rounded-pill border-2 fw-bold"
                            onClick={() => cancelOffer(offer.offerId, offer.name, offer.offerPriceFormatted)}
                          >
                            ❌ Cancel Offer
                          </Button>
                          <small className="text-center text-muted fst-italic" style={{fontSize: '0.75rem'}}>
                            Locked: {offer.offerPriceFormatted} ETH
                          </small>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                  
                  {/* Seller Info Footer */}
                  <Card.Footer className="bg-white border-top-0 pt-0 pb-3">
                     <div className="d-flex align-items-center justify-content-center p-2 rounded bg-light">
                        <small className="text-muted me-2">Seller:</small>
                        <small className="font-monospace text-dark fw-bold">
                          {offer.seller.slice(0, 6)}...{offer.seller.slice(-4)}
                        </small>
                     </div>
                  </Card.Footer>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  );
}