import { useState } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button } from 'react-bootstrap'

// 🔥 THAY TOKEN NÀY BẰNG JWT TOKEN CỦA PINATA
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

  // Upload image handler
  const uploadToIPFS = async (event) => {
    event.preventDefault()
    const file = event.target.files[0]
    if (!file) return

    try {
      const url = await uploadImageToPinata(file)
      console.log("Image uploaded:", url)
      setImage(url)
    } catch (error) {
      console.log("Pinata image upload error:", error)
    }
  }

  // Mint & list NFT
  const createNFT = async () => {
    if (!image || !price || !name || !description) return

    try {
      // Build metadata object
      const metadata = { image, price, name, description }

      // Upload metadata.json → IPFS (Pinata)
      const metadataURL = await uploadMetadataToPinata(metadata)
      console.log("Metadata uploaded:", metadataURL)

      // Mint NFT → returns tokenId
      await (await nft.mint(metadataURL)).wait()

      const id = await nft.tokenCount()
      console.log("Minted token ID:", id.toString())

      // Approve marketplace
      await (await nft.setApprovalForAll(marketplace.address, true)).wait()

      // Convert ETH price to wei
      const listingPrice = ethers.utils.parseEther(price.toString())

      // List on marketplace
      await (await marketplace.makeItem(nft.address, id, listingPrice)).wait()

      alert("NFT created & listed successfully!")
    } catch (error) {
      console.log("Create NFT error:", error)
    }
  }

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
          <div className="content mx-auto">
            <Row className="g-4">
              <Form.Control
                type="file"
                required
                name="file"
                onChange={uploadToIPFS}
              />
              <Form.Control onChange={(e) => setName(e.target.value)} size="lg" required type="text" placeholder="Name" />
              <Form.Control onChange={(e) => setDescription(e.target.value)} size="lg" required as="textarea" placeholder="Description" />
              <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in ETH" />
              <div className="d-grid px-0">
                <Button onClick={createNFT} variant="primary" size="lg">
                  Create & List NFT!
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Create;
