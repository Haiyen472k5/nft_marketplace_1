import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card } from 'react-bootstrap'

function renderSoldItems(items) {
  return (
    <>
      <h2 className="mt-5">Sold Items</h2>
      <Row xs={1} md={2} lg={4} className="g-4 py-3">
        {items.map((item, idx) => (
          <Col key={idx} className="overflow-hidden">
            <Card className="h-100">
              {/* --- SỬA HIỂN THỊ ẢNH CHO PHẦN SOLD --- */}
              <div style={{ height: '250px', overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Card.Img 
                  variant="top" 
                  src={item.image} 
                  style={{ 
                    maxHeight: '100%', 
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain' 
                  }} 
                />
              </div>
              {/* --------------------------------------- */}
              <Card.Body>
                <Card.Title>{item.name}</Card.Title>
                <Card.Text>{item.description}</Card.Text>
              </Card.Body>
              
              <Card.Footer>
                For {ethers.utils.formatEther(item.totalPrice)} BNB - Recieved {ethers.utils.formatEther(item.price)} BNB
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true)
  const [listedItems, setListedItems] = useState([])
  const [soldItems, setSoldItems] = useState([])
  
  const loadListedItems = async () => {
    // Load all sold items that the user listed
    const itemCount = await marketplace.itemCount()
    let listedItems = []
    let soldItems = []
    for (let indx = 1; indx <= itemCount; indx++) {
      const i = await marketplace.items(indx)
      if (i.seller.toLowerCase() === account.toLowerCase()) { // Thêm toLowerCase cho chắc chắn
        // get uri url from nft contract
        const uri = await nft.tokenURI(i.tokenId)
        // use uri to fetch the nft metadata stored on ipfs 
        const response = await fetch(uri)
        const metadata = await response.json()
        // get total price of item (item price + fee)
        const totalPrice = await marketplace.getTotalPrice(i.itemId)
        // define listed item object
        let item = {
          totalPrice,
          price: i.price,
          itemId: i.itemId,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image
        }
        listedItems.push(item)
        // Add listed item to sold items array if sold
        if (i.sold) soldItems.push(item)
      }
    }
    setLoading(false)
    setListedItems(listedItems)
    setSoldItems(soldItems)
  }
  
  useEffect(() => {
    // Chỉ load khi có account
    if (account) {
        loadListedItems()
    }
  }, [account]) // Thêm account vào dependency

  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )
  
  return (
    <div className="flex justify-center">
      {listedItems.length > 0 ?
        <div className="px-5 py-3 container">
            <h2>Listed Items</h2>
          <Row xs={1} md={2} lg={4} className="g-4 py-3">
            {listedItems.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card className="h-100">
                  {/* --- SỬA HIỂN THỊ ẢNH CHO PHẦN LISTED --- */}
                  <div style={{ height: '250px', overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Card.Img 
                      variant="top" 
                      src={item.image} 
                      style={{ 
                        maxHeight: '100%', 
                        maxWidth: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain' 
                      }} 
                    />
                  </div>
                  {/* ---------------------------------------- */}
                  <Card.Body>
                      <Card.Title>{item.name}</Card.Title>
                      <Card.Text>
                        {item.description}
                      </Card.Text>
                  </Card.Body>
                  <Card.Footer>{ethers.utils.formatEther(item.totalPrice)} BNB</Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
            {soldItems.length > 0 && renderSoldItems(soldItems)}
        </div>
        : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No listed assets</h2>
          </main>
        )}
    </div>
  );
}