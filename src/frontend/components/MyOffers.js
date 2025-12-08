import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Badge, Alert, ListGroup } from 'react-bootstrap'

export default function MyOffers({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [myListings, setMyListings] = useState([])
  const [error, setError] = useState(null)

  const loadMyOffersData = async () => {
    try {
      setError(null)

      if (!marketplace.address || !nft.address || !account) {
        throw new Error("Not connected")
      }

      const itemCount = await marketplace.itemCount()
      let listingsWithOffers = []

      // Get all items where user is seller
      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplace.items(i)
        
        if (item.currentOwner.toLowerCase() === account.toLowerCase() && !item.sold) {
          // Get metadata
          const uri = await nft.tokenURI(item.tokenId)
          const response = await fetch(uri)
          const metadata = await response.json()
          const totalPrice = await marketplace.getTotalPrice(item.itemId)

          // Get offers for this item
          const offerIds = await marketplace.getItemOffers(i)
          let offers = []

          for (let j = 0; j < offerIds.length; j++) {
            const offerDetails = await marketplace.getOffer(offerIds[j])
            
            // Only show active offers (not accepted, not cancelled)
            if (!offerDetails.accepted && !offerDetails.cancelled) {
              offers.push({
                offerId: offerDetails.offerId.toNumber(),
                buyer: offerDetails.buyer,
                price: offerDetails.price,
                priceFormatted: ethers.utils.formatEther(offerDetails.price)
              })
            }
          }

          // Only add items that have offers
          if (offers.length > 0) {
            listingsWithOffers.push({
              itemId: item.itemId.toNumber(),
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              listingPrice: totalPrice,
              listingPriceFormatted: ethers.utils.formatEther(totalPrice),
              offers: offers.sort((a, b) => b.price - a.price) // Sort by highest offer first
            })
          }
        }
      }

      setMyListings(listingsWithOffers)
      setLoading(false)
    } catch (error) {
      console.error("Error loading offers:", error)
      setLoading(false)
      setError("Failed to load offers. Please try again.")
    }
  }

  const acceptOffer = async (offerId, itemName, offerPrice) => {
    try {
      const confirmed = window.confirm(
        `Accept offer of ${offerPrice} ETH for "${itemName}"?\n\nThe NFT will be transferred to the buyer immediately.`
      )

      if (!confirmed) return

      const tx = await marketplace.acceptOffer(offerId)
      alert("⏳ Processing transaction...")
      await tx.wait()
      alert("✅ Offer accepted! NFT has been transferred.")
      
      // Reload data
      loadMyOffersData()
    } catch (error) {
      console.error("Error accepting offer:", error)
      if (error.code === 4001) {
        alert("❌ Transaction cancelled")
      } else {
        alert("❌ Failed to accept offer: " + (error.reason || error.message))
      }
    }
  }

  useEffect(() => {
    loadMyOffersData()
  }, [marketplace, nft, account])

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
        <h2 className="fw-bold mb-0">📬 Offers Received</h2>
        <Badge bg="primary" className="ms-3 fs-6 rounded-pill">
          {myListings.length} Items with offers
        </Badge>
      </div>

      {myListings.length === 0 ? (
        <Alert variant="info" className="text-center py-5 shadow-sm border-0 rounded-3">
          <div className="display-1 mb-3">📭</div>
          <h4>No Offers Yet</h4>
          <p className="text-muted">When buyers make offers on your listed NFTs, they will appear here.</p>
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {myListings.map((listing, idx) => (
            <Col key={idx}>
              <Card className="h-100 nft-card border-0">
                
                {/* --- PHẦN HÌNH ẢNH (Dùng class mới để không bị cắt ảnh) --- */}
                <div className="nft-image-container">
                    <img 
                      src={listing.image} 
                      alt={listing.name}
                      className="nft-image"
                    />
                    <span className="status-badge bg-primary text-white">
                      {listing.offers.length} Offer{listing.offers.length > 1 ? 's' : ''}
                    </span>
                </div>

                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="fw-bold text-truncate" style={{maxWidth: '70%'}}>
                        {listing.name}
                    </Card.Title>
                    <small className="text-muted">#{listing.itemId}</small>
                  </div>

                  {/* Giá niêm yết */}
                  <div className="price-box mb-3">
                    <div className="offer-label">Your Listing Price</div>
                    <div className="price-value text-muted">
                        {Number(listing.listingPriceFormatted).toFixed(3)} <small>ETH</small>
                    </div>
                  </div>

                  <hr className="my-2" />
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="fw-bold text-dark">📋 Offer List</small>
                    <small className="text-muted" style={{fontSize: '0.7rem'}}>Highest first</small>
                  </div>
                  
                  {/* Danh sách các Offer (Cuộn được nếu quá dài) */}
                  <div className="flex-grow-1 custom-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {listing.offers.map((offer, offerIdx) => {
                      const percentOfListing = (parseFloat(offer.priceFormatted) / parseFloat(listing.listingPriceFormatted) * 100).toFixed(0)
                      
                      // Màu sắc % giống như MySentOffers
                      let badgeColor = 'secondary';
                      if (percentOfListing >= 100) badgeColor = 'success';
                      else if (percentOfListing >= 80) badgeColor = 'info';
                      else if (percentOfListing >= 50) badgeColor = 'warning';

                      return (
                        <div key={offerIdx} className="p-3 mb-2 bg-light rounded-3 border position-relative">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <div className="fw-bold text-primary fs-5">
                                    {Number(offer.priceFormatted).toFixed(3)} ETH
                                </div>
                                <div className="small text-muted font-monospace">
                                    From: {offer.buyer.slice(0, 4)}...{offer.buyer.slice(-4)}
                                </div>
                            </div>
                            <Badge bg={badgeColor} className="align-self-start">
                                {percentOfListing}%
                            </Badge>
                          </div>
                          
                          <Button 
                            variant="success" 
                            size="sm"
                            className="w-100 rounded-pill fw-bold shadow-sm"
                            onClick={() => acceptOffer(offer.offerId, listing.name, offer.priceFormatted)}
                          >
                            ✓ Accept Offer
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}