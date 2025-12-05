import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button, Badge } from 'react-bootstrap'

const Home = ({ marketplace, nft, account }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)

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
          
          const isOwnItem = account && item.seller.toLowerCase() === account.toLowerCase()
          // Add item to items array
          items.push({
            totalPrice,
            itemId: item.itemId,
            seller: item.seller,
            name: metadata.name,
            description: metadata.description,
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
        'Do you want to buy "${item.name}" for ${ethers.utils.formatEther(item.totalPrice)} BNB?'
      );

      if (!confirmed) return;

      const tx = await marketplace.purchaseItem(item.itemId, { value: item.totalPrice })

      alert("Transaction submitted! Waiting for confirmation...");
      await tx.wait()
      
      alert("Purchase successful! The NFT is now yours.");

      loadMarketplaceItems()

    } catch (error) {
      console.error("Error buying item:", error)

      if (error.code === 4001) {
        alert("❌ Transaction was cancelled")
      } else if (error.message.includes("insufficient funds")) {
        alert("❌ Insufficient BNB in your wallet")
      } else if (error.message.includes("already sold")) {
        alert("❌ This item has already been sold")
        loadMarketplaceItems() // Refresh list
      } else {
        alert("❌ Purchase failed: " + (error.reason || error.message))
      }
    }
  }

  useEffect(() => {
    loadMarketplaceItems()
  }, [marketplace, nft, account])
  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading marketplace...</p>
      </div>
    </main>
  )

  if (error) return (
    <main style={{ padding: "2rem" }}>
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">❌ Error</h4>
        <p>{error}</p>
        <hr />
        <button className="btn btn-outline-danger" onClick={() => window.location.reload()}>
          🔄 Reload Page
        </button>
      </div>
    </main>
  )

return (
    <div className="flex justify-center">
      {items.length > 0 ? (
        <div className="px-5 container">
          
          {/* --- SỬA ĐỔI 1: ĐƯA BADGE SANG PHẢI --- */}
          <div className="d-flex justify-content-end mt-4 mb-2">
            <Badge bg="info" className="fs-6">
              {items.length} {items.length === 1 ? 'item' : 'items'} available
            </Badge>
          </div>
          {/* -------------------------------------- */}
          
          <Row xs={1} md={2} lg={4} className="g-4 py-3">
            {items.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card 
                  className={`h-100 ${item.isOwnItem ? 'border-warning border-2' : ''}`}
                  style={{ 
                    transition: 'transform 0.2s',
                    cursor: item.isOwnItem ? 'default' : 'pointer'
                  }}
                  // ... (Các sự kiện onMouse giữ nguyên)
                >
                  {/* ... (Phần Your Item Badge giữ nguyên) ... */}
                  {item.isOwnItem && (
                    <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 1 }}>
                      <Badge bg="warning" text="dark">Your Item</Badge>
                    </div>
                  )}
                  
                  {/* --- SỬA ĐỔI 2: HIỂN THỊ ẢNH ĐẦY ĐỦ --- */}
                  <div style={{ height: '250px', overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Card.Img 
                      variant="top" 
                      src={item.image} 
                      style={{ 
                        maxHeight: '100%', 
                        maxWidth: '100%',
                        width: 'auto',        // Để chiều rộng tự nhiên
                        height: 'auto',       // Để chiều cao tự nhiên
                        objectFit: 'contain', // QUAN TRỌNG: Giúp ảnh không bị cắt
                        filter: item.isOwnItem ? 'brightness(0.9)' : 'none'
                      }} 
                    />
                  </div>
                  {/* -------------------------------------- */}
                  
                  <Card.Body>
                    {/* ... (Phần nội dung bên dưới giữ nguyên) ... */}
                    <Card.Title className="d-flex justify-content-between align-items-center">
                      <span>{item.name}</span>
                    </Card.Title>
                    <Card.Text className="text-muted">
                      {item.description}
                    </Card.Text>
                    
                    {item.isOwnItem && (
                      <div className="alert alert-warning py-2 px-3 mb-0 small" role="alert">
                        🏷️ This is your listing
                      </div>
                    )}
                  </Card.Body>
                  
                  <Card.Footer>
                    <div className='d-grid'>
                      {item.isOwnItem ? (
                        <Button variant="outline-secondary" size="lg" disabled style={{ cursor: 'not-allowed' }}>
                          🚫 Cannot Buy Your Own Item
                        </Button>
                      ) : (
                        <Button onClick={() => buyMarketItem(item)} variant="primary" size="lg">
                          💎 Buy for {ethers.utils.formatEther(item.totalPrice)} BNB
                        </Button>
                      )}
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ) : (
        // ... (Phần loading/empty giữ nguyên) ...
        <main style={{ padding: "4rem 0", textAlign: 'center' }}>
           <div className="text-muted">
             <h2>📦 No Listed NFTs</h2>
             <p className="mt-3">Be the first to list an NFT for sale!</p>
           </div>
        </main>
      )}
    </div>
  );
}

export default Home