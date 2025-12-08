import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Badge, Modal, Form, InputGroup, Container, Spinner } from 'react-bootstrap'
import { Link } from "react-router-dom"

const Home = ({ marketplace, nft, account }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [offerPrice, setOfferPrice] = useState('')

  const loadMarketplaceItems = async () => {
    // Load all unsold items
    try {
      setError(null)

      if (!marketplace.address || !nft.address) {
        throw new Error("Contract not initialized")
      }
    
      const itemCount = await marketplace.itemCount()
      let items = []
      for (let i = 1; i <= itemCount; i++) {
        const item = await marketplace.items(i)
        if (!item.sold) {
          // get uri url from nft contract
          const uri = await nft.tokenURI(item.tokenId)
          // use uri to fetch the nft metadata stored on ipfs 
          const response = await fetch(uri)
          const metadata = await response.json()
          // get total price of item (item price + fee)
          const totalPrice = await marketplace.getTotalPrice(item.itemId)
          
          const isOwnItem = account && item.currentOwner.toLowerCase() === account.toLowerCase()
          // Add item to items array
          items.push({
            totalPrice,
            price: item.price,
            itemId: item.itemId,
            seller: item.currentOwner,
            name: metadata.name,
            description: metadata.description,
            itemType: metadata.itemType,
            image: metadata.image,
            isOwnItem
          })
        }
      }
      setLoading(false)
      setItems(items)
    } catch (error) {
      console.error("Error loading marketplace items", error)
      setLoading(false)
      if (error.code === 'CALL_EXCEPTION') {
        setError("Smart contracts are not available. Please deploy contracts first.")
      } else if (error.message.includes("not initialized")) {
        setError("Please connect your wallet to continue.")
      } else {
        setError("Unable to load NFT listings. Please try again later.")
      }
    }
  }

  const buyMarketItem = async (item) => {
    try {
      if (item.isOwnItem) {
        alert("You cannot purchase your own item!");
        return;
      }

      const confirmed = window.confirm(
        'Do you want to buy "${item.name}" for ${ethers.utils.formatEther(item.totalPrice)} ETH?'
      );

      if (!confirmed) return;

      const tx = await marketplace.purchaseItem(item.itemId, { value: item.totalPrice })
      await tx.wait()
      
      alert("Purchase successful! The NFT is now yours.");

      loadMarketplaceItems()

    } catch (error) {
      console.error("Error buying item:", error)

      if (error.code === 4001) {
        alert("❌ Transaction was cancelled")
      } else if (error.message.includes("insufficient funds")) {
        alert("❌ Insufficient ETH in your wallet")
      } else if (error.message.includes("already sold")) {
        alert("❌ This item has already been sold")
        loadMarketplaceItems() // Refresh list
      } else {
        alert("❌ Purchase failed: " + (error.reason || error.message))
      }
    }
  }

  const handleMakeOffer = (item) => {
    if (item.isOwnItem) {
      alert("You cannot make an offer on you own item!");
      return;
    }

    setSelectedItem(item)
    setOfferPrice('')
    setShowOfferModal(true)

  }

  const submitOffer = async () => {
    try {
      if (!offerPrice || parseFloat(offerPrice) <= 0) {
        alert("❌ Please enter a valid offer price");
        return;
      }

      const offerValue = ethers.utils.parseEther(offerPrice)
      const listingPriceEther = ethers.utils.formatEther(selectedItem.totalPrice)
      
      // Show warning if offer is very low
      const offerPercent = (parseFloat(offerPrice) / parseFloat(listingPriceEther)) * 100
      if (offerPercent < 50) {
        const confirmed = window.confirm(
          `Your offer is ${offerPercent.toFixed(0)}% of the listing price. Are you sure?`
        )
        if (!confirmed) return
      }

      setShowOfferModal(false)
      
      const tx = await marketplace.makeOffer(selectedItem.itemId, { value: offerValue })
      alert("⏳ Submitting offer...");
      await tx.wait()
      alert(`✅ Offer submitted! The seller will be notified.`)
      
    } catch (error) {
      console.error("Error making offer:", error)
      if (error.code === 4001) {
        alert("❌ Transaction cancelled")
      } else if (error.message.includes("insufficient funds")) {
        alert("❌ Insufficient ETH for this offer")
      } else {
        alert("❌ Failed to make offer: " + (error.reason || error.message))
      }
    }
  }

  useEffect(() => {
    loadMarketplaceItems()
  }, [marketplace.address, nft.address, account])

  const formatAddress = (addr) => {
    return addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : 'Unknown'
  }

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
      <p className="mt-3 text-muted fw-bold">Loading Marketplace...</p>
    </div>
  )

  if (error) return (
    <Container className="py-5">
      <div className="alert alert-danger shadow-sm border-0" role="alert">
        <h4 className="alert-heading"><i className="bi bi-exclamation-triangle-fill"></i> Error</h4>
        <p>{error}</p>
        <hr />
        <Button as={Link} to="/home" variant="outline-danger" className="mt-3 px-4 rounded-pill">
          🔄 Reload Page
        </Button>
      </div>
    </Container>
  )

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Hero Section Nhỏ */}  
      <div className="d-flex justify-content-end mt-4 mb-2">
          <Badge bg="info" className="fs-6">
            {items.length} {items.length === 1 ? 'item' : 'items'} available
          </Badge>
      </div>
      <Container>
        {items.length > 0 ? (
          <Row xs={1} md={2} lg={4} className="g-4">
            {items.map((item, idx) => (
              <Col key={idx}>
                <Card 
                  className="h-100 border-0 shadow-sm"
                  style={{ 
                    transition: 'all 0.3s ease',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transform: 'translateZ(0)' // Fix flickering on some browsers
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 .5rem 1rem rgba(0,0,0,.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
                  }}
                >
                  {/* Badge Your Item */}
                  {item.isOwnItem && (
                    <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 2 }}>
                      <Badge bg="warning" text="dark" className="shadow-sm">
                        <i className="bi bi-person-circle me-1"></i> You Own This
                      </Badge>
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="position-relative" style={{ height: '260px', backgroundColor: '#f3f4f6' }}>
                    <Card.Img 
                      variant="top" 
                      src={item.image} 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: '10px'
                      }} 
                    />
                  </div>
                  
                  <Card.Body className="d-flex flex-column pt-3 pb-2">
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2" style={{ borderBottom: '1px dashed #e9ecef', paddingBottom: '4px' }}>
                          <span className="text-uppercase fw-bold" style={{ color: '#6f42c1', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                            Seller
                          </span>
                          <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                            <span className="text-primary">@{formatAddress(item.seller)}</span>
                          </small>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-2" style={{ borderBottom: '1px dashed #e9ecef', paddingBottom: '4px' }}>
                          <span className="text-uppercase fw-bold" style={{ color: '#6f42c1', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                            Name
                          </span>
                          <span className="fw-bold text-dark text-end text-truncate" style={{ maxWidth: '65%', fontSize: '0.9rem' }} title={item.name}>
                            {item.name}
                          </span>
                        </div>


                        <div className="d-flex justify-content-between align-items-center mb-2" style={{ borderBottom: '1px dashed #e9ecef', paddingBottom: '4px' }}>
                          <span className="text-uppercase fw-bold" style={{ color: '#6f42c1', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                            Description
                          </span>
                          <span className="fw-bold text-muted text-end text-truncate" style={{ maxWidth: '65%', fontSize: '0.85rem' }} title={item.description}>
                            {item.description}
                          </span>
                        </div>

                        {item.itemType && (
                          <div className="d-flex justify-content-between align-items-center mb-2" style={{ borderBottom: '1px dashed #e9ecef', paddingBottom: '4px' }}>
                            <span className="text-uppercase fw-bold" style={{ color: '#6f42c1', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                              Type
                            </span>
                            <Badge bg="info" className="fw-normal" style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                              {item.itemType}
                            </Badge>
                          </div>
                        )}
                    </div>
                  
                    <div className="mt-auto">
                      <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded-3">
                        <span className="text-muted small">Price</span>
                        <span className="fw-bold text-primary fs-5">
                          {ethers.utils.formatEther(item.totalPrice)} <small className="fs-6 text-dark">ETH</small>
                        </span>
                      </div>

                      {item.isOwnItem ? (
                        <div className="d-grid">
                           <Button variant="secondary" size="sm" disabled style={{ opacity: 0.7 }}>
                             🔒 Owner
                           </Button>
                        </div>
                      ) : (
                        <Row className="g-2">
                          <Col xs={8}>
                            <Button 
                              onClick={() => buyMarketItem(item)} 
                              variant="primary" 
                              className="w-100 fw-bold"
                              style={{ fontSize: '0.9rem' }}
                            >
                              Buy Now
                            </Button>
                          </Col>
                          <Col xs={4}>
                            <Button 
                              onClick={() => handleMakeOffer(item)} 
                              variant="outline-primary"
                              className="w-100"
                              style={{ fontSize: '0.9rem' }}
                              title="Make Offer"
                            >
                              Offer
                            </Button>
                          </Col>
                        </Row>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="text-center py-5">
            <div className="mb-3 text-muted" style={{ fontSize: '4rem' }}>📦</div>
            <h3 className="fw-bold text-muted">No items listed yet</h3>
            <p className="text-secondary">Be the first to list an NFT on the marketplace!</p>
          </div>
        )}
      </Container>
      
      {/* Offer Modal - Styled */}
      <Modal show={showOfferModal} onHide={() => setShowOfferModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>💰 Make an Offer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <>
              <div className="text-center mb-3">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.name}
                  style={{ maxHeight: '150px', borderRadius: '8px' }}
                />
                <h5 className="mt-2">{selectedItem.name}</h5>
              </div>
              
              <div className="alert alert-info">
                <small>
                  <strong>Listing Price:</strong> {ethers.utils.formatEther(selectedItem.totalPrice)} ETH
                </small>
              </div>

              <Form.Group>
                <Form.Label>Your Offer Price</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Enter your offer"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    autoFocus
                  />
                  <InputGroup.Text>ETH</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted">
                  Your ETH will be locked until the seller accepts or you cancel the offer.
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOfferModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submitOffer}>
            Submit Offer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Home