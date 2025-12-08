import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Container, Badge, Button, Spinner, Modal } from 'react-bootstrap'
import { Link } from "react-router-dom"
import QRCode from "react-qr-code"

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  
  const loadPurchasedItems = async () => {
    // Fetch purchased items from marketplace by quering Offered events with the buyer set as the user
    // Lọc sự kiện 'Bought' để tìm những item mà người mua == account hiện tại
    const filter =  marketplace.filters.ItemSold(null,null,null,null,null,account)
    const results = await marketplace.queryFilter(filter)
    
    //Fetch metadata of each nft and add that to listedItem object.
    const purchases = await Promise.all(results.map(async i => {
      // fetch arguments from each result
      i = i.args
      // get uri url from nft contract
      const uri = await nft.tokenURI(i.tokenId)
      // use uri to fetch the nft metadata stored on ipfs 
      const response = await fetch(uri)
      const metadata = await response.json()
      // get total price of item (item price + fee)
      const totalPrice = await marketplace.getTotalPrice(i.itemId)
      // define listed item object
      let purchasedItem = {
        totalPrice,
        price: i.price,
        itemId: i.itemId,
        tokenId: i.tokenId,
        name: metadata.name,
        description: metadata.description,
        type: metadata.itemType,
        image: metadata.image
      }
      return purchasedItem
    }))
    setLoading(false)
    setPurchases(purchases)
  }
  
  useEffect(() => {
    loadPurchasedItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="grow" variant="primary" style={{ width: '3rem', height: '3rem' }} />
      <p className="mt-3 text-muted fw-bold">Loading your collection...</p>
    </div>
  )

  // Empty State (Chưa mua gì)
  if (!loading && purchases.length === 0) return (
    <Container className="py-5 text-center">
      <div className="py-5 bg-light rounded-3 shadow-sm border">
        <div style={{ fontSize: '4rem' }}>🛒</div>
        <h2 className="mt-3 fw-bold">No Purchases Yet</h2>
        <p className="text-muted">Explore the marketplace to start your digital collection.</p>
        <Button as={Link} to="/home" variant="primary" size="lg" className="mt-3 px-5 rounded-pill shadow-sm">
          Explore Marketplace
        </Button>
      </div>
    </Container>
  )
  
  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Header Section */}
      <div className="d-flex justify-content-end mt-4 mb-2">
          <Badge bg="info" className="fs-6">
              {purchases.length} {purchases.length === 1 ? 'Asset' : 'Assets'} Owned
          </Badge>
      </div>

      <Container>
          <Row xs={1} md={2} lg={4} className="g-4">
            {purchases.map((item, idx) => (
              <Col key={idx}>
                <Card 
                    className="h-100 border-0 shadow-sm"
                    style={{ 
                      transition: 'transform 0.2s',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Badge Owned */}
                  <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 2 }}>
                    <Badge bg="success" className="shadow-sm">
                        <i className="bi bi-check-circle-fill me-1"></i> Owned
                    </Badge>
                  </div>

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
                              {item.type}
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
                    </div>
                    <div className="mt-auto">
                        {/* NÚT SHOW QR CODE - CHỈ CÓ Ở TRANG NÀY */}
                        <Button 
                            variant="dark" 
                            className="w-100 mb-2" 
                            onClick={() => setSelectedTicket(item)}
                        >
                            <i className="bi bi-qr-code"></i> Check-in QR
                        </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
      </Container>

      {/* MODAL HIỂN THỊ QR CODE BẢO MẬT */}
      <Modal show={!!selectedTicket} onHide={() => setSelectedTicket(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>🎟 Ticket Entry Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center bg-white">
          {selectedTicket && (
            <>
              <h5 className="mb-3">{selectedTicket.name}</h5>
              <div className="p-4 border d-inline-block rounded bg-light">
                {/* QR CODE ĐƯỢC TẠO TỰ ĐỘNG */}
                <QRCode 
                  value={JSON.stringify({ 
                    tokenId: selectedTicket.tokenId.toString(), 
                    owner: account 
                  })} 
                  size={200} 
                  level="H"
                />
              </div>
              <p className="mt-3 text-muted small">
                Token ID: #{selectedTicket.tokenId.toString()} <br/>
                Show this code to the event staff.
              </p>
              <div className="alert alert-warning small mt-2">
                <i className="bi bi-shield-lock"></i> Do not share this QR with others.
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}