const { ethers } = require("hardhat");
const {
    ERC1820_REGISTRY_ABI,
    ERC1820_REGISTRY_ADDRESS,
    ERC1820_REGISTRY_DEPLOY_TX,
    ERC1820_REGISTRY_DEPLOYER,
} = require("./data");

const getERC1820InterfaceHash = str => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(str));

/**
 * Returns an erc1820Registry contract object
 * @returns {Promise<ethers.Contract>}
 */
const getDeployedERC1820Registry = async () => {
    // Read https://eips.ethereum.org/EIPS/eip-1820 for more information
    const code = await ethers.provider.getCode(ERC1820_REGISTRY_ADDRESS);
    const [account] = await ethers.getSigners();
    if(code === '0x') {
        // 0.08 ether is needed to deploy the registry, and those funds need to be transferred to the account that will deploy
        // the contract.
        const tx = await account.sendTransaction({
            to: ERC1820_REGISTRY_DEPLOYER,
            value: ethers.utils.parseUnits("0.08", "ether")
        });
        await tx.wait();
        await ethers.provider.send('eth_sendRawTransaction', [ERC1820_REGISTRY_DEPLOY_TX]);
        // console.log('ERC1820Registry successfully deployed');
    } else {
        // console.log('ERC1820Registry already deployed');
    }

    return new ethers.Contract(
        ERC1820_REGISTRY_ADDRESS, 
        ERC1820_REGISTRY_ABI, 
        account
    );
};

module.exports = {
    getDeployedERC1820Registry,
    getERC1820InterfaceHash
};