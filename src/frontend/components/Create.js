import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Form, Button, Card, Container, Badge, InputGroup, Spinner, Image } from 'react-bootstrap'

// 🔥 THAY TOKEN NÀY BẰNG JWT TOKEN CỦA PINATA (GIỮ NGUYÊN TỪ FILE GỐC)
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkYzY0MmFkOC04NDRhLTQzYmYtYWQyOC1mNTFlMzU5MTA2MjEiLCJlbWFpbCI6ImdwdGNsYXVkZTY4QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIwM2I5ZmQwOWUwNDRhOWVkYmJhMyIsInNjb3BlZEtleVNlY3JldCI6IjU0OGNiYzFmNDg2NjFkODVlYWMwYTgzMzM2YmUxOTcyOWEyMjczNjFiY2RhNjhiODMxYzVkOTdmODEzYzkyZWEiLCJleHAiOjE3OTYzNjA2NzB9.deCZcO3aD371Yr-3LBKbkm-kJ1uiDw6uwk6_hGM_tjo";

// ----------------------
// UPLOAD IMAGE TO PINATA
// ----------------------
const uploadImageToPinata = async (file) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  let formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  const data = await res.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
};

// ----------------------
// UPLOAD METADATA (JSON)
// ----------------------
const uploadMetadataToPinata = async (metadata) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  const data = await res.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
};

const Create = ({ marketplace, nft, account }) => {
  const [isIssuer, setIsIssuer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [issuerInfo, setIssuerInfo] = useState(null)

  const [image, setImage] = useState('')
  const [price, setPrice] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemType, setItemType] = useState('0') // 0=TICKET, 1=VOUCHER, 2=MEMBERSHIP
  const [expiryDate, setExpiryDate] = useState('')
  const [maxResales, setMaxResales] = useState('2')

  const ISSUER_ROLE = ethers.utils.id("ISSUER_ROLE")

  useEffect(() => {
    checkIssuerRole()
  }, [marketplace, account])

  const checkIssuerRole = async () => {
    if (!marketplace || !marketplace.address || !account) {
      setIsIssuer(false)
      setLoading(false)
      return
    }

    try {
      // Check if has issuer role
      const hasIssuer = await marketplace.hasRole(ISSUER_ROLE, account)
      
      if (hasIssuer) {
        // Get issuer info
        const info = await marketplace.getIssuerInfo(account)
        
        if (info.isActive) {
          setIsIssuer(true)
          setIssuerInfo({
            name: info.name,
            description: info.description,
            totalItemsCreated: info.totalItemsCreated.toNumber(),
            totalSales: info.totalSales.toNumber()
          })
        } else {
          setIsIssuer(false)
        }
      } else {
        setIsIssuer(false)
      }
      
      setLoading(false)
    } catch (error) {
      console.error("Error checking issuer role:", error)
      setIsIssuer(false)
      setLoading(false)
    }
  }

  
  // State UI mới để tăng trải nghiệm người dùng
  const [uploadingImg, setUploadingImg] = useState(false)
  const [creatingNft, setCreatingNft] = useState(false)

  // Upload image handler
  const uploadToIPFS = async (event) => {
    event.preventDefault()
    const file = event.target.files[0]
    if (!file) return

    try {
      setUploadingImg(true) // Bắt đầu loading
      const url = await uploadImageToPinata(file)
      console.log("Image uploaded:", url)
      setImage(url)
      setUploadingImg(false) // Kết thúc loading
    } catch (error) {
      console.log("Pinata image upload error:", error)
      setUploadingImg(false)
    }
  }

  // Mint & list NFT
  const createNFT = async () => {
    if (!image || !price || !name || !description) return

    try {
      setCreatingNft(true) // Bắt đầu loading button

      // Build metadata object
      const metadata = { image, 
                        price, 
                        name, 
                        description, 
                        itemType: ['TICKET', 'VOUCHER', 'MEMBERSHIP'][itemType],
                        expiryDate: expiryDate || 'No expiry',
                        maxResales,
                        issuer: issuerInfo?.name || account
                      }

      // Upload metadata.json → IPFS (Pinata)
      const metadataURL = await uploadMetadataToPinata(metadata)
      console.log("Metadata uploaded:", metadataURL)

      // Mint NFT → returns tokenId
      const txMint = await nft.mint(metadataURL)
      await txMint.wait()

      const id = await nft.tokenCount()
      console.log("Minted token ID:", id.toString())

      // Approve marketplace
      const txApprove = await nft.setApprovalForAll(marketplace.address, true)
      await txApprove.wait()

      // Convert ETH price to wei
      const listingPrice = ethers.utils.parseEther(price.toString())
      const expiryTimestamp = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : 0

      // List on marketplace
      const txList = await marketplace.createItem(nft.address, id, listingPrice, parseInt(itemType), expiryTimestamp, parseInt(maxResales))
      await txList.wait()

      setCreatingNft(false)
      alert("NFT created & listed successfully!")
      
      // Optional: Reset form or redirect (Logic giữ nguyên nên tôi không redirect)
      setName('')
      setPrice('')
      setDescription('')
      setImage('')
      setItemType('0')
      setExpiryDate('')
      setMaxResales('2')
      
    } catch (error) {
      console.log("Create NFT error:", error)
      setCreatingNft(false)
      alert("Error creating NFT! Check console.")
    }
  }

  if (!isIssuer) return (
    <div className="container py-5 text-center">
      <div className="alert alert-warning shadow-sm border-0">
        <h2 className="fw-bold"><i className="bi bi-lock-fill"></i> Access Denied</h2>
        <p className="lead">Only authorized Issuers can create new Tickets/Vouchers.</p>
        <p>Please contact the Administrator to become an Issuer.</p>
      </div>
    </div>
  )

    return (
    <Container className="mt-5">
      <Row>
        <div className="col-lg-8 mx-auto">
          {/* Issuer Info Card */}
          {issuerInfo && (
            <Card className="mb-4 border-success">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">
                      ✅ Authorized Issuer
                      <Badge bg="success" className="ms-2">Verified</Badge>
                    </h5>
                    <p className="text-muted mb-1"><strong>{issuerInfo.name}</strong></p>
                    <small className="text-muted">{issuerInfo.description}</small>
                  </div>
                  <div className="text-end">
                    <div className="mb-1">
                      <small className="text-muted">Items Created:</small>
                      <div className="fw-bold">{issuerInfo.totalItemsCreated}</div>
                    </div>
                    <div>
                      <small className="text-muted">Total Sales:</small>
                      <div className="fw-bold">{issuerInfo.totalSales}</div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          <Card>
            <Card.Header>
              <h4 className="mb-0">🎫 Create Ticket/Voucher</h4>
            </Card.Header>
            <Card.Body>
              <Form>
                <Row className="g-4">
                  {/* Image Upload */}
                  <Form.Group>
                    <Form.Label>Image/Photo *</Form.Label>
                    <Form.Control
                      type="file"
                      required
                      name="file"
                      onChange={uploadToIPFS}
                    />
                    <Form.Text className="text-muted">
                      Upload ticket design, QR code, or voucher image
                    </Form.Text>
                    {image && (
                      <div className="mt-2">
                        <img src={image} alt="Preview" style={{maxWidth: '200px', borderRadius: '8px'}} />
                      </div>
                    )}
                  </Form.Group>

                  {/* Name */}
                  <Form.Group>
                    <Form.Label>Title *</Form.Label>
                    <Form.Control 
                      onChange={(e) => setName(e.target.value)} 
                      size="lg" 
                      required 
                      type="text" 
                      placeholder="e.g., Taylor Swift Concert Ticket" 
                      value={name}
                    />
                  </Form.Group>

                  {/* Description */}
                  <Form.Group>
                    <Form.Label>Description *</Form.Label>
                    <Form.Control 
                      onChange={(e) => setDescription(e.target.value)} 
                      size="lg" 
                      required 
                      as="textarea" 
                      rows={3}
                      placeholder="Describe the ticket/voucher details, terms, and conditions" 
                      value={description}
                    />
                  </Form.Group>

                  {/* Type */}
                  <Form.Group>
                    <Form.Label>Type *</Form.Label>
                    <Form.Select 
                      size="lg"
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                    >
                      <option value="0">🎫 Ticket (Event-based)</option>
                      <option value="1">🎁 Voucher (Redeemable)</option>
                      <option value="2">👑 Membership (Long-term)</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Price */}
                  <Form.Group>
                    <Form.Label>Price (ETH) *</Form.Label>
                    <Form.Control 
                      onChange={(e) => setPrice(e.target.value)} 
                      size="lg" 
                      required 
                      type="number" 
                      step="0.001"
                      min="0"
                      placeholder="0.5" 
                      value={price || ''}
                    />
                  </Form.Group>

                  {/* Expiry Date */}
                  <Form.Group>
                    <Form.Label>Expiry Date (Optional)</Form.Label>
                    <Form.Control 
                      onChange={(e) => setExpiryDate(e.target.value)} 
                      size="lg"
                      type="datetime-local"
                      value={expiryDate}
                    />
                    <Form.Text className="text-muted">
                      Leave empty for no expiry. For events, set to event date/time.
                    </Form.Text>
                  </Form.Group>

                  {/* Max Resales */}
                  <Form.Group>
                    <Form.Label>Maximum Resales Allowed</Form.Label>
                    <Form.Select 
                      size="lg"
                      value={maxResales}
                      onChange={(e) => setMaxResales(e.target.value)}
                    >
                      <option value="0">0 - Non-transferable</option>
                      <option value="1">1 - Can resell once</option>
                      <option value="2">2 - Can resell twice</option>
                      <option value="3">3 - Can resell 3 times</option>
                      <option value="5">5 - Can resell 5 times</option>
                      <option value="999">Unlimited</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Control how many times this can be resold to prevent scalping
                    </Form.Text>
                  </Form.Group>

                  {/* Submit Button */}
                  <div className="d-grid px-0">
                    <Button 
                      onClick={createNFT} 
                      variant="success" 
                      size="lg"
                      disabled={!image || !price || !name || !description}
                    >
                      ✨ Create & List on Marketplace
                    </Button>
                  </div>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </Row>
    </Container>
  );
}

export default Create;