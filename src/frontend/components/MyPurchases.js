import { useState, useEffect } from 'react'
import { ethers } from "ethers"

import { Row, Col, Card, Container, Badge, Button, Spinner } from 'react-bootstrap'
import { Link } from "react-router-dom"

export default function MyPurchases({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState([])
  
  const loadPurchasedItems = async () => {
    // Fetch purchased items from marketplace by quering Offered events with the buyer set as the user
    // Lọc sự kiện 'Bought' để tìm những item mà người mua == account hiện tại
    const filter =  marketplace.filters.Bought(null,null,null,null,null,account)
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
        name: metadata.name,
        description: metadata.description,
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
                  
                  <Card.Body>
                      <Card.Title as="h5" className="fw-bold text-truncate">{item.name}</Card.Title>
                      <Card.Text className="text-muted small text-truncate" style={{ minHeight: '20px' }}>
                          {item.description}
                      </Card.Text>
                      
                      <div className="mt-3 pt-3 border-top">
                          <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Purchased For</small>
                          <div className="d-flex align-items-center mt-1">
                              <span className="fs-5 fw-bold text-dark me-1">
                                {ethers.utils.formatEther(item.totalPrice)}
                              </span>
                              <span className="text-primary fw-bold small">BNB</span>
                          </div>
                      </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
      </Container>
    </div>
  );
}