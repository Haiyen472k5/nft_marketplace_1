import {
    Link
} from "react-router-dom";
import { Navbar, Nav, Button, Container, Dropdown } from 'react-bootstrap'
import market from './market.png'

const Navigation = ({ web3Handler, account, disconnectWallet, changeWallet }) => {
    return (
        <Navbar expand="lg" bg="dark" variant="dark" className="py-3 shadow-sm sticky-top">
            <Container>
                {/* BRAND LOGO & NAME */}
                <Navbar.Brand as={Link} to="/" className="fw-bold d-flex align-items-center">
                    <img src={market} width="40" height="40" className="me-2" alt="Marketplace Logo" />
                    <span style={{ 
                        background: 'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '1.25rem'
                    }}>
                        DApp NFT Marketplace
                    </span>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="responsive-navbar-nav" className="border-0 focus-ring-0" />
                
                <Navbar.Collapse id="responsive-navbar-nav">
                    {/* NAVIGATION LINKS */}
                    <Nav className="me-auto ms-lg-4">
                        <Nav.Link as={Link} to="/home" className="mx-2 fw-semibold">Home</Nav.Link>
                        <Nav.Link as={Link} to="/create" className="mx-2 fw-semibold">Create</Nav.Link>
                        <Nav.Link as={Link} to="/my-listed-items" className="mx-2">My Listed Items</Nav.Link>
                        <Nav.Link as={Link} to="/my-purchases" className="mx-2">My Purchases</Nav.Link>
                        
                        {/* Nhóm các mục Offers lại gần nhau hoặc tách biệt nhẹ */}
                        <div className="d-lg-flex border-start border-secondary ms-lg-2 ps-lg-2">
                             <Nav.Link as={Link} to="/my-offers" className="mx-2 text-info">Offers Received</Nav.Link>
                             <Nav.Link as={Link} to="/my-sent-offers" className="mx-2 text-warning">Offers Sent</Nav.Link>
                        </div>
                    </Nav>

                    {/* WALLET CONNECTION */}
                    <Nav className="mt-3 mt-lg-0">
                        {account ? (
                            <Dropdown align="end">
                                <Dropdown.Toggle 
                                    variant="outline-light" 
                                    id="dropdown-wallet"
                                    className="rounded-pill px-4 border-2 d-flex align-items-center"
                                >
                                    <div className="rounded-circle bg-success me-2" style={{width: '10px', height: '10px'}}></div>
                                    {account.slice(0, 5) + '...' + account.slice(38, 42)}
                                </Dropdown.Toggle>

                                <Dropdown.Menu className="shadow-lg mt-2 border-0">
                                    <div className="px-3 py-2 text-muted small">
                                        Wallet Options
                                    </div>
                                    <Dropdown.Item 
                                        href={`https://etherscan.io/address/${account}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="fw-bold"
                                    >
                                        <i className="bi bi-box-arrow-up-right me-2"></i> View on Etherscan
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={changeWallet}>
                                        <i className="bi bi-wallet2 me-2"></i> Change Wallet
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={disconnectWallet} className="text-danger">
                                        <i className="bi bi-box-arrow-right me-2"></i> Disconnect
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (
                            <Button 
                                onClick={web3Handler} 
                                variant="primary" 
                                className="rounded-pill px-4 fw-bold shadow-sm"
                                style={{ background: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)', border: 'none' }}
                            >
                                Connect Wallet
                            </Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}

export default Navigation;