import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Col, Form, Button, Card, Container, InputGroup, Spinner, Image } from 'react-bootstrap'

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

const Create = ({ marketplace, nft }) => {
  const [image, setImage] = useState('')
  const [price, setPrice] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  
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
      const metadata = { image, price, name, description }

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

      // List on marketplace
      const txList = await marketplace.makeItem(nft.address, id, listingPrice)
      await txList.wait()

      setCreatingNft(false)
      alert("NFT created & listed successfully!")
      
      // Optional: Reset form or redirect (Logic giữ nguyên nên tôi không redirect)
      setName('')
      setPrice('')
      setDescription('')
      setImage('')
      
    } catch (error) {
      console.log("Create NFT error:", error)
      setCreatingNft(false)
      alert("Error creating NFT! Check console.")
    }
  }

  return (
    <div className="bg-light min-vh-100 py-5">
      <Container>
        <div className="mb-4">
          <h2 className="fw-bold">Create New Item</h2>
          <p className="text-muted">Upload your image, set a price, and list it for sale.</p>
        </div>

        <Row className="g-5">
          {/* CỘT TRÁI: FORM NHẬP LIỆU */}
          <Col lg={7}>
            <div className="bg-white p-4 rounded-3 shadow-sm border">
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">Upload File</Form.Label>
                <div className="border-2 border-dashed rounded-3 p-4 text-center" style={{ borderColor: '#dee2e6', borderStyle: 'dashed', backgroundColor: '#f8f9fa' }}>
                  <Form.Control
                    type="file"
                    required
                    name="file"
                    onChange={uploadToIPFS}
                    accept="image/*"
                    className="mb-2"
                  />
                  <Form.Text className="text-muted">
                    Supports JPG, PNG, GIF. Max size: 10MB.
                  </Form.Text>
                  {uploadingImg && (
                    <div className="mt-3">
                      <Spinner animation="border" size="sm" variant="primary" /> <span className="text-primary ms-2">Uploading to IPFS...</span>
                    </div>
                  )}
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Name</Form.Label>
                <Form.Control 
                  onChange={(e) => setName(e.target.value)} 
                  value={name}
                  size="lg" 
                  required 
                  type="text" 
                  placeholder="e.g. 'Cosmic Monkey #001'" 
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Description</Form.Label>
                <Form.Control 
                  onChange={(e) => setDescription(e.target.value)} 
                  value={description}
                  size="lg" 
                  required 
                  as="textarea" 
                  rows={4}
                  placeholder="Provide a detailed description of your item" 
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">Price</Form.Label>
                <InputGroup size="lg">
                  <Form.Control 
                    onChange={(e) => setPrice(e.target.value)} 
                    value={price || ''}
                    required 
                    type="number" 
                    placeholder="0.00" 
                    min="0"
                  />
                  <InputGroup.Text className="fw-bold">ETH</InputGroup.Text>
                </InputGroup>
              </Form.Group>

              <div className="d-grid">
                <Button 
                  onClick={createNFT} 
                  variant="primary" 
                  size="lg" 
                  disabled={!image || !price || !name || !description || creatingNft}
                  style={{ height: '50px' }}
                >
                  {creatingNft ? (
                     <>
                       <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                       Minting & Listing...
                     </>
                  ) : (
                    "Create & List NFT"
                  )}
                </Button>
              </div>
            </div>
          </Col>

          {/* CỘT PHẢI: LIVE PREVIEW */}
          <Col lg={5}>
            <div className="sticky-top" style={{ top: '100px' }}>
              <h5 className="text-muted mb-3">Preview</h5>
              <Card className="shadow border-0 rounded-3 overflow-hidden">
                 {/* Khung ảnh Preview */}
                <div style={{ height: '350px', backgroundColor: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {image ? (
                    <Card.Img 
                      variant="top" 
                      src={image} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        padding: '10px'
                      }} 
                    />
                  ) : (
                    <div className="text-center text-muted">
                      <i className="bi bi-image" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                      <p className="mt-2">Image Preview</p>
                    </div>
                  )}
                </div>

                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                       <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.75rem' }}>
                         NFT Marketplace
                       </small>
                       <Card.Title as="h4" className="fw-bold mt-1 mb-0">
                         {name || "Item Name"}
                       </Card.Title>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                     <p className="text-muted small mb-0">Description</p>
                     <p className="text-dark">
                       {description ? (description.length > 100 ? description.substring(0, 100) + '...' : description) : "Description will appear here..."}
                     </p>
                  </div>

                  <hr className="my-3" />
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted d-block">Price</small>
                      <span className="fs-5 fw-bold text-primary">
                        {price || "0.00"} ETH
                      </span>
                    </div>
                    <Button variant="outline-primary" size="sm" disabled>
                      Buy Now
                    </Button>
                  </div>
                </Card.Body>
              </Card>
              
              <div className="alert alert-info mt-4 small border-0 bg-white shadow-sm">
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>Note:</strong> Transaction fee (Gas) will be applied when creating the NFT.
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Create;