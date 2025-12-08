import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Container, Row, Col, Card, Button, Form, Table, Badge, Alert, Modal, InputGroup } from 'react-bootstrap'

export default function AdminDashboard({ marketplace, account }) {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [issuers, setIssuers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Fee Management States
  const [currentFee, setCurrentFee] = useState(0)
  const [newFee, setNewFee] = useState('')
  const [updatingFee, setUpdatingFee] = useState(false)

  // Form states for Issuer
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
        // Load danh sách Issuer và Fee hiện tại song song
        await Promise.all([loadIssuers(), loadCurrentFee()])
      }
      
      setLoading(false)
    } catch (error) {
      console.error("Error checking admin role:", error)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  // --- LOGIC MỚI: TẢI PHÍ HIỆN TẠI ---
  const loadCurrentFee = async () => {
    try {
      const fee = await marketplace.feePercent()
      setCurrentFee(fee.toNumber())
    } catch (error) {
      console.error("Error loading fee:", error)
    }
  }

  // --- LOGIC MỚI: CẬP NHẬT PHÍ ---
  const handleUpdateFee = async () => {
    try {
      // Validate input
      if (!newFee || newFee === '') return;
      const feeValue = parseInt(newFee);

      if (feeValue < 0 || feeValue > 10) {
        alert("❌ Fee must be between 0% and 10% (Contract Limit)");
        return;
      }

      setUpdatingFee(true);
      const tx = await marketplace.setFeePercent(feeValue);
      
      alert("⏳ Updating transaction fee...");
      await tx.wait();
      
      alert(`✅ Fee updated to ${feeValue}% successfully!`);
      setCurrentFee(feeValue);
      setNewFee('');
      setUpdatingFee(false);

    } catch (error) {
      console.error("Error updating fee:", error);
      setUpdatingFee(false);
      if (error.code === 4001) {
        alert("❌ Transaction cancelled");
      } else {
        alert("❌ Failed to update fee: " + (error.reason || error.message));
      }
    }
  }

  const loadIssuers = async () => {
    try {
      const filter = marketplace.filters.IssuerAdded()
      const results = await marketplace.queryFilter(filter)
      const issuerMap = new Map()

      for (const event of results) {
        const issuerAddress = event.args.issuer
        issuerMap.set(issuerAddress, true)
      }
      
      const issuersData = await Promise.all(
        Array.from(issuerMap.keys()).map(async (issuerAddress) => {
          try {
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
      const activeIssuers = issuersData.filter(issuer => issuer && issuer.isActive === true);
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
      alert("❌ Failed to add issuer: " + (error.reason || error.message))
    }
  }

  const handleRemoveIssuer = async (issuerAddress) => {
    try {
      const confirmed = window.confirm(
        `Remove issuer authorization for ${issuerAddress}?`
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

  if (loading) return <Container className="py-5 text-center"><div className="spinner-border text-primary"></div></Container>

  if (!isAdmin) return (
    <Container className="py-5">
      <Alert variant="danger">🚫 Access Denied. Admin only.</Alert>
    </Container>
  )

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>👑 Admin Dashboard</h1>
          <p className="text-muted">Manage system settings, fees, and issuers</p>
        </Col>
      </Row>

      {/* --- PHẦN 1: FEE SETTINGS & SYSTEM CONTROL --- */}
      <Row className="mb-4 g-4">
        {/* Card chỉnh sửa Fee */}
        <Col md={5}>
          <Card className="h-100 shadow-sm border-primary">
            <Card.Header className="bg-primary text-white fw-bold">
              ⚙️ Transaction Fee Settings
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Current Fee:</span>
                <Badge bg="success" style={{fontSize: '1.2em'}}>{currentFee}%</Badge>
              </div>
              
              <Form.Label>Update Fee Percentage (Max 10%)</Form.Label>
              <InputGroup className="mb-3">
                <Form.Control
                  type="number"
                  placeholder="Enter new fee (0-10)"
                  min="0"
                  max="10"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                />
                <InputGroup.Text>%</InputGroup.Text>
                <Button 
                  variant="primary" 
                  onClick={handleUpdateFee}
                  disabled={updatingFee || !newFee}
                >
                  {updatingFee ? 'Updating...' : 'Save'}
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                This fee applies to all future sales on the marketplace.
              </Form.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Card Pause/Resume System */}
        <Col md={7}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="fw-bold">🚦 System Status Control</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-center">
              <p className="text-muted mb-4">
                Emergency control to freeze all marketplace transactions (Listing, Buying, Offering).
              </p>
              <div className="d-flex gap-3">
                <Button 
                  variant="warning" 
                  size="lg"
                  className="w-50"
                  onClick={() => handlePauseMarketplace(true)}
                >
                  ▶️ Pause System
                </Button>
                <Button 
                  variant="success" 
                  size="lg"
                  className="w-50"
                  onClick={() => handlePauseMarketplace(false)}
                >
                  ⏸️ Resume System
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <hr className="my-5"/>

      {/* --- PHẦN 2: ISSUER MANAGEMENT (GIỮ NGUYÊN) --- */}
      <Row className="mb-4">
        <Col className="d-flex justify-content-between align-items-end">
           <div>
             <h3>📋 Authorized Issuers</h3>
             <p className="text-muted mb-0">Manage businesses allowed to create tickets.</p>
           </div>
           <Button variant="outline-primary" onClick={() => setShowAddModal(true)}>
             ➕ Add New Issuer
           </Button>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {issuers.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No issuers added yet.</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Business Info</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Metrics</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issuers.map((issuer, idx) => (
                  <tr key={idx}>
                    <td className="ps-4">
                      <div className="fw-bold">{issuer.name}</div>
                      <small className="text-muted">{issuer.description}</small>
                    </td>
                    <td className="font-monospace small align-middle">
                      {issuer.address}
                    </td>
                    <td className="align-middle">
                      <Badge bg={issuer.isActive ? 'success' : 'secondary'}>
                        {issuer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="align-middle">
                       <div><small>Items:</small> <strong>{issuer.totalItems}</strong></div>
                       <div><small>Sales:</small> <strong>{issuer.totalSales}</strong></div>
                    </td>
                    <td className="text-end pe-4 align-middle">
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleRemoveIssuer(issuer.address)}
                      >
                        Remove Access
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add Issuer Modal (Giữ nguyên) */}
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
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Business Name *</Form.Label>
              <Form.Control
                type="text"
                value={newIssuer.name}
                onChange={(e) => setNewIssuer({...newIssuer, name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newIssuer.description}
                onChange={(e) => setNewIssuer({...newIssuer, description: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddIssuer}>Confirm Add</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}