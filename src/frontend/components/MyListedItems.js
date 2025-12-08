import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Container, Spinner, Badge, Button } from 'react-bootstrap'
import { Link } from "react-router-dom"

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [listedItems, setListedItems] = useState([])
  const [soldItems, setSoldItems] = useState([])
  
  const loadListedItems = async () => {
    try {
      const itemCount = await marketplace.itemCount()
      let listedItems = []
      let soldItems = []
      
      for (let indx = 1; indx <= itemCount; indx++) {
        const i = await marketplace.items(indx)
        
        // Chỉ lấy item của người dùng hiện tại
        if (i.issuer.toLowerCase() === account.toLowerCase()) {
          const uri = await nft.tokenURI(i.tokenId)
          const response = await fetch(uri)
          const metadata = await response.json()
          const totalPrice = await marketplace.getTotalPrice(i.itemId)
          
          let item = {
            totalPrice,
            price: i.price,
            itemId: i.itemId,
            name: metadata.name,
            description: metadata.description,
            type: metadata.itemType,
            image: metadata.image,
            sold: i.sold // Lưu trạng thái sold để hiển thị Badge
          }
          
          listedItems.push(item)
          
          if (i.sold) {
            soldItems.push(item)
          }
        }
      }
      setLoading(false)
      setListedItems(listedItems)
      setSoldItems(soldItems)
    } catch (error) {
      console.error("Error loading listed items:", error)
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (account) {
        loadListedItems()
    }
  }, [account])

  // --- RENDERING HELPERS ---

  if (loading) return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
      <p className="mt-3 text-muted fw-bold">Loading your portfolio...</p>
    </div>
  )

  // Empty State
  if (!loading && listedItems.length === 0) return (
    <Container className="py-5 text-center">
      <div className="py-5 bg-light rounded-3 shadow-sm border">
        <div style={{ fontSize: '4rem' }}>📭</div>
        <h2 className="mt-3 fw-bold">No Listed Assets</h2>
        <p className="text-muted">You haven't listed any NFTs for sale yet.</p>
        <Button as={Link} to="/create" variant="primary" size="lg" className="mt-3 px-4 rounded-pill">
          Create NFT
        </Button>
      </div>
    </Container>
  )
  
  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Header Section */}
      <Container>
        {/* --- SECTION 1: ALL LISTED ITEMS --- */}
        <div className="d-flex align-items-center mb-3">
            <h4 className="fw-bold mb-0 me-3">Active Listings & Portfolio</h4>
            <Badge bg="primary" pill>{listedItems.length}</Badge>
        </div>

        <Row xs={1} md={2} lg={4} className="g-4 mb-5">
          {listedItems.map((item, idx) => (
            <Col key={idx}>
              <Card className="h-100 border-0 shadow-sm" style={{ transition: 'transform 0.2s', overflow: 'hidden' }}>
                
                {/* Sold Badge Overlay */}
                {item.sold && (
                  <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 2 }}>
                    <Badge bg="success" className="shadow-sm">SOLD</Badge>
                  </div>
                )}

                {/* Image */}
                <div className="position-relative" style={{ height: '240px', backgroundColor: '#f3f4f6' }}>
                    <Card.Img 
                      variant="top" 
                      src={item.image} 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: '10px',
                        filter: item.sold ? 'grayscale(100%)' : 'none', // Làm xám ảnh nếu đã bán
                        opacity: item.sold ? 0.8 : 1
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
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* --- SECTION 2: SOLD ITEMS HISTORY --- */}
        {soldItems.length > 0 && (
          <>
            <hr className="my-5" />
            <div className="d-flex align-items-center mb-3">
                <h4 className="fw-bold mb-0 me-3 text-success">
                    <i className="bi bi-cash-coin me-2"></i>Sold History
                </h4>
                <Badge bg="success" pill>{soldItems.length}</Badge>
            </div>
            
            <Row xs={1} md={2} lg={4} className="g-4">
              {soldItems.map((item, idx) => (
                <Col key={idx}>
                  <Card className="h-100 border-success shadow-sm" style={{ opacity: 0.9 }}>
                    <div className="position-relative" style={{ height: '200px', backgroundColor: '#e9ecef' }}>
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
                        <div className="position-absolute bottom-0 start-0 w-100 bg-success text-white text-center py-1 small fw-bold" style={{opacity: 0.9}}>
                            SOLD
                        </div>
                    </div>
                    
                    <Card.Body className="pb-2">
                      <Card.Title as="h6" className="text-truncate">{item.name}</Card.Title>
                      <Card.Text className="text-muted small">
                         Sold to a lucky collector!
                      </Card.Text>
                    </Card.Body>
                    
                    <Card.Footer className="bg-success bg-opacity-10 border-success">
                       <div className="d-flex justify-content-between align-items-center small">
                          <span className="text-dark fw-bold">Earned:</span>
                          <span className="fw-bold text-success">
                            + {ethers.utils.formatEther(item.price)} ETH
                          </span>
                       </div>
                       <div className="text-center text-muted" style={{fontSize: '0.7rem'}}>
                           (After Fees)
                       </div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Container>
    </div>
  );
}