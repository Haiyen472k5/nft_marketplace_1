import {
    Link
} from "react-router-dom";
import { Navbar, Nav, Button, Container, Dropdown } from 'react-bootstrap'
import market from './market.png'

const Navigation = ({ web3Handler, account, disconnectWallet, changeWallet }) => {
    return (
        <Navbar expand="lg" bg="secondary" variant="dark">
            <Container>
                <Navbar.Brand href="http://www.dappuniversity.com/bootcamp">
                    <img src={market} width="40" height="40" className="" alt="" />
                    &nbsp; DApp NFT Marketplace
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/create">Create</Nav.Link>
                        <Nav.Link as={Link} to="/my-listed-items">My Listed Items</Nav.Link>
                        <Nav.Link as={Link} to="/my-purchases">My Purchases</Nav.Link>
                    </Nav>
                    <Nav>
                        {account ? (
                            <Dropdown align="end">
                                <Dropdown.Toggle variant="outline-light" id="dropdown-wallet">
                                    {account.slice(0, 5) + '...' + account.slice(38, 42)}
                                </Dropdown.Toggle>

                                <Dropdown.Menu>
                                    <Dropdown.Item 
                                        href={`https://etherscan.io/address/${account}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View on Etherscan
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={changeWallet}>
                                        Change Wallet
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={disconnectWallet}>
                                        Disconnect
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (
                            <Button onClick={web3Handler} variant="outline-light">
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