const { ethers } = require('hardhat');
const { getDeployedERC1820Registry, getERC1820InterfaceHash } = require('erc1820');

const Name = "My erc777 Token"
const Symbol = "MYT";
const InitialSupply = ethers.BigNumber.from(100000000);


const main = async () => {
    // ensure that erc1820 is deployed
    await getDeployedERC1820Registry();

    const account = await ethers.getSigner();

    // deploy ERC777Contract
    const ERC777Contract = await ethers.getContractFactory("ERC777Contract");
    const erc777Contract = await ERC777Contract.deploy(
        Name,
        Symbol,
        InitialSupply,
        [account.address]
    );
    await erc777Contract.deployed();
    console.log(`erc777Contract address: ${erc777Contract.address}`);

    // deploy TokensSender hook contract
    const TokensSender = await ethers.getContractFactory("TokensSender");
    const tokensSender = await TokensSender.deploy(true);
    await tokensSender.deployed();
    console.log(`tokensSender address: ${tokensSender.address}`);

    // deploy TokenRecipient hook contract
    const TokensRecipient = await ethers.getContractFactory("TokensRecipient");
    const tokensRecipient = await TokensRecipient.deploy(true);
    await tokensRecipient.deployed();
    console.log(`tokensRecipient address: ${tokensRecipient.address}`);

    console.log("deploy finish...");
};

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error);
        process.exit(1);
    });