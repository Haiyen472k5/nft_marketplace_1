import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Container, Row, Col, Card, Button, Form, Table, Badge, Alert, Modal } from 'react-bootstrap'

export default function AdminDashboard({ marketplace, account }) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [issuers, setIssuers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const[redeemId, setRedeemId] = useState('')
  const [message, setMessage] = useState('')

  
  // Form states
  const [newIssuer, setNewIssuer] = useState({
    address: '',
    name: '',
    description: ''
  })

  const ADMIN_ROLE = ethers.utils.id("ADMIN_ROLE")

  useEffect(() => {
    checkAdminRole()
  }, [marketplace, account])

  const checkAdminRole = async () => {
    try {
      if (!marketplace.address || !account) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const hasAdmin = await marketplace.hasRole(ADMIN_ROLE, account)
      setIsAdmin(hasAdmin)
      
      if (hasAdmin) {
        loadIssuers()
      }
      
      setLoading(false)
    } catch (error) {
      console.error("Error checking admin role:", error)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const loadIssuers = async () => {
    try {
      // 1. Lấy tất cả sự kiện 'IssuerAdded' từ quá khứ
      const filter = marketplace.filters.IssuerAdded()
      const results = await marketplace.queryFilter(filter)

      const issuerMap = new Map()

      for (const event of results) {
        const issuerAddress = event.args.issuer
        issuerMap.set(issuerAddress, true)
      }
      // 2. Duyệt qua từng sự kiện để lấy thông tin chi tiết
      const issuersData = await Promise.all(
        Array.from(issuerMap.keys()).map(async (issuerAddress) => {
          try {
            // Gọi hàm getIssuerInfo từ Smart Contract
            const info = await marketplace.getIssuerInfo(issuerAddress)
            
            return {
              address: issuerAddress,
              name: info.name,
              description: info.description,
              isActive: info.isActive,
              totalItems: info.totalItemsCreated.toString(),
              totalSales: info.totalSales.toString()
            }
          } catch (error) {
            console.error(`Error loading issuer ${issuerAddress}:`, error)
            return null
          }
        })
      )

      const activeIssuers = issuersData.filter(issuer => issuer.isActive === true);

      setIssuers(activeIssuers)
    } catch (error) {
      console.error("Error loading issuers:", error)
    }
  }

  const handleAddIssuer = async () => {
    try {
      if (!ethers.utils.isAddress(newIssuer.address)) {
        alert("❌ Invalid address")
        return
      }

      if (!newIssuer.name || !newIssuer.description) {
        alert("❌ Please fill all fields")
        return
      }

      const tx = await marketplace.addIssuer(
        newIssuer.address,
        newIssuer.name,
        newIssuer.description
      )

      alert("⏳ Adding issuer...")
      await tx.wait()
      alert("✅ Issuer added successfully!")

      setShowAddModal(false)
      setNewIssuer({ address: '', name: '', description: '' })
      loadIssuers()
    } catch (error) {
      console.error("Error adding issuer:", error)
      if (error.code === 4001) {
        alert("❌ Transaction cancelled")
      } else {
        alert("❌ Failed to add issuer: " + (error.reason || error.message))
      }
    }
  }

  const handleRemoveIssuer = async (issuerAddress) => {
    try {
      const confirmed = window.confirm(
        `Remove issuer authorization for ${issuerAddress}?\n\nThey will no longer be able to create new items.`
      )

      if (!confirmed) return

      const tx = await marketplace.removeIssuer(issuerAddress)
      alert("⏳ Removing issuer...")
      await tx.wait()
      alert("✅ Issuer removed!")

      loadIssuers()
    } catch (error) {
      console.error("Error removing issuer:", error)
      alert("❌ Failed to remove issuer: " + (error.reason || error.message))
    }
  }

  const handlePauseMarketplace = async (pause) => {
    try {
      const tx = await marketplace.setPaused(pause)
      alert(`⏳ ${pause ? 'Pausing' : 'Resuming'} marketplace...`)
      await tx.wait()
      alert(`✅ Marketplace ${pause ? 'paused' : 'resumed'}!`)
    } catch (error) {
      console.error("Error toggling pause:", error)
      alert("❌ Failed: " + (error.reason || error.message))
    }
  }

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Checking permissions...</p>
      </Container>
    )
  }

  if (!isAdmin) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>🚫 Access Denied</Alert.Heading>
          <p>You don't have administrator permissions.</p>
          <hr />
          <p className="mb-0">
            <small>Current account: {account || 'Not connected'}</small>
          </p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>👑 Admin Dashboard</h1>
          <p className="text-muted">Manage ticket/voucher issuers and marketplace settings</p>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3>{issuers.length}</h3>
              <small className="text-muted">Active Issuers</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Button 
                variant="primary" 
                onClick={() => setShowAddModal(true)}
                className="w-100"
              >
                ➕ Add Issuer
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Button 
                variant="warning" 
                onClick={() => handlePauseMarketplace(true)}
                className="w-100"
              >
                ⏸️ Pause Marketplace
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
            <Card className="text-center">
            <Card.Body>
              <Button 
                variant="success" 
                onClick={() => handlePauseMarketplace(false)}
                className="w-100"
              >
                ▶️ Resume Marketplace
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Issuers List */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">📋 Authorized Issuers</h5>
        </Card.Header>
        <Card.Body>
          {issuers.length === 0 ? (
            <Alert variant="info">
              No issuers added yet. Click "Add Issuer" to authorize businesses to create tickets/vouchers.
            </Alert>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Business Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Items Created</th>
                  <th>Total Sales</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issuers.map((issuer, idx) => (
                  <tr key={idx}>
                    <td className="font-monospace small">
                      {issuer.address.slice(0, 10)}...{issuer.address.slice(-8)}
                    </td>
                    <td><strong>{issuer.name}</strong></td>
                    <td>{issuer.description}</td>
                    <td>
                      <Badge bg={issuer.isActive ? 'success' : 'secondary'}>
                        {issuer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{issuer.totalItems}</td>
                    <td>{issuer.totalSales}</td>
                    <td>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleRemoveIssuer(issuer.address)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
      {/* Add Issuer Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>➕ Add New Issuer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Wallet Address *</Form.Label>
              <Form.Control
                type="text"
                placeholder="0x..."
                value={newIssuer.address}
                onChange={(e) => setNewIssuer({...newIssuer, address: e.target.value})}
              />
              <Form.Text className="text-muted">
                The wallet address of the business/organization
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Business Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Vinpearl Events"
                value={newIssuer.name}
                onChange={(e) => setNewIssuer({...newIssuer, name: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Brief description of the business..."
                value={newIssuer.description}
                onChange={(e) => setNewIssuer({...newIssuer, description: e.target.value})}
              />
            </Form.Group>

            <Alert variant="warning" className="small">
              <strong>⚠️ Important:</strong> This address will be able to create and manage tickets/vouchers on the platform. Only add trusted businesses.
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddIssuer}>
            Add Issuer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* <Col md={6}>
        <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-white fw-bold border-bottom-0 pt-4">
                🎟️ Ticket Check-in (Redeem)
            </Card.Header>
            <Card.Body>
                <div className="alert alert-info small">
                    Use this tool to scan/validate tickets at the gate. This will mark the NFT as "Used" on the blockchain.
                </div>
                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Ticket ID</Form.Label>
                    <Form.Control 
                        type="number" 
                        placeholder="Enter Token ID" 
                        value={redeemId}
                        onChange={(e) => setRedeemId(e.target.value)}
                        style={{ fontSize: '1.5rem', textAlign: 'center' }}
                    />
                </Form.Group>
                <Button variant="success" size="lg" onClick={redeemTicket} disabled={loading} className="w-100">
                    {loading ? "Checking..." : "✅ Redeem / Check-in"}
                </Button>
            </Card.Body>
        </Card>
      </Col> */}
    </Container>
  );
}