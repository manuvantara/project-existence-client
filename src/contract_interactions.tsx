import { ethers, Transaction } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import { DataHexString } from 'ethers/types/utils/data';
import { AddressLike } from 'ethers/types/address';
import { NETWORK } from './config';
import { toFunctionSelector } from './utils';

const ORGANISATION_FACTORY_ABI = [
  'function deployOrganisation (string _organisationMetadata, address _organisationOwner) public',
  'function setFees (uint _organisationDeploymentFee, uint _registerDeploymentFee, uint _recordDeploymentFee) public',
  'event OrganisationDeployed (address organisation, address organisationOwner)',
  'event FeesUpdated(uint organisationDeploymentFee, uint registerDeploymentFee, uint recordCreationFee)',
  'function organisations(address organisation) public view returns (bool)',
  'function organisationsOfOwner(address owner, uint256 id) public view returns (address)',
  'function organisationDeploymentFee() public view returns (uint256)',
  'function registerDeploymentFee() public view returns (uint256)',
  'function recordDeploymentFee() public view returns (uint256)',
];
const ORGANISATION_ABI = [
  'function deployRegister (string _registerMetadata) public',
  'function editOrganisationMetadata (string _metadata) public',
  'event RegisterDeployed (address register, address registerAdmin)',
  'event OrganisationMetadataUpdated (address organisation, string metadata)',
  'function registers(uint256 id) public view returns (address)',
  'function metadata() public view returns (string)',
  'function owner() public view returns (address)',
];
const REGISTER_ABI = [
  'function createRecord(bytes32 _documentHash, string _sourceDocument, string _referenceDocument, uint256 _startsAt, uint256 _expiresAt, bytes32 _pastDocumentHash) public',
  'function invalidateRecord(bytes32 _documentHash) public',
  'function editRegisterMetadata(string _metadata) public',
  'event RecordCreated (bytes32 documentHash)',
  'event RecordUpdated (bytes32 documentHash)',
  'event RecordInvalidated (bytes32 documentHash)',
  'event RegisterMetadataEdited (address register, string metadata)',
  'function organisation() public view returns (address)',
  'function metadata() public view returns (string)',
  'function records(bytes32 id) public view returns (bytes32,address,address,string,string,uint256,uint256,uint256,uint256,bytes32,bytes32)',
  'function hasRole(bytes32 role, address account) public view returns (bool)',
];

// For values that have a simple meaning in JavaScript, the types are fairly straightforward; strings and booleans are returned as JavaScript strings and booleans.
// For numbers, if the type is in the JavaScript safe range (i.e. less than 53 bits, such as an int24 or uint48) a normal JavaScript number is used. Otherwise a BigNumber is returned.
// For bytes (both fixed length and dynamic), a DataHexString is returned.
// address is AddressLike (string or Addressable)
type OrganisationFactoryContract = ethers.Contract & {
  deployOrganisation: (
    metadata: string,
    owner: AddressLike,
  ) => Promise<Transaction>;
  setFees: (
    orgDeploymentFee: BigInt,
    registerDeploymentFee: BigInt,
    recordDeploymentFee: BigInt,
  ) => Promise<Transaction>;
  organisations: (address: AddressLike) => Promise<boolean>;
  organisationsOfOwner: (
    owner: AddressLike,
    id: number,
  ) => Promise<AddressLike>;
  organisationDeploymentFee: () => BigInt;
  registerDeploymentFee: () => BigInt;
  recordDeploymentFee: () => BigInt;
};
type OrganisationContract = ethers.Contract & {
  editOrganisationMetadata: (metadata: string) => Promise<Transaction>;
  deployRegister: (metadata: string) => Promise<Transaction>;
  registers: (id: number) => Promise<AddressLike>;
  metadata: () => Promise<string>;
  owner: () => Promise<AddressLike>;
};
type RegisterContract = ethers.Contract & {
  createRecord: (
    documentHash: DataHexString,
    sourceDocument: string,
    referenceDocument: string,
    startsAt: BigInt,
    expiresAt: BigInt,
    pastDocumentHash: DataHexString,
  ) => Promise<Transaction>;
  invalidateRecord: (documentHash: DataHexString) => Promise<Transaction>;
  editRegisterMetadata: (metadata: string) => Promise<Transaction>;
  organisation: () => Promise<AddressLike>;
  metadata: () => Promise<string>;
  records: (
    documentHash: DataHexString,
  ) => Promise<
    [
      DataHexString,
      AddressLike,
      AddressLike,
      string,
      string,
      BigInt,
      BigInt,
      BigInt,
      BigInt,
      DataHexString,
      DataHexString,
    ]
  >;
  hasRole: (role: DataHexString, account: AddressLike) => Promise<boolean>;
};
export type Record = {
  documentHash: DataHexString;

  creator: AddressLike;
  updater: AddressLike;

  sourceDocument: string;
  referenceDocument: string;

  createdAt: BigInt;
  updatedAt: BigInt;
  startsAt: BigInt;
  expiresAt: BigInt;

  pastDocumentHash: DataHexString;
  nextDocumentHash: DataHexString;
};
export type {
  OrganisationFactoryContract,
  OrganisationContract,
  RegisterContract,
};

export const RECORD_CREATOR_ROLE: DataHexString = ethers.keccak256(
  ethers.toUtf8Bytes('RECORD_CREATOR'),
);
export const RECORD_INVALIDATOR_ROLE: DataHexString = ethers.keccak256(
  ethers.toUtf8Bytes('RECORD_INVALIDATOR'),
);
export const REGISTER_EDITOR_ROLE: DataHexString = ethers.keccak256(
  ethers.toUtf8Bytes('REGISTER_EDITOR'),
);

let networkId = 0xfa;
if (NETWORK === 'testnet') networkId = 0xfa2;
if (NETWORK === 'fakenet') networkId = 0xfa3;

let rpcLink: string;
switch (NETWORK) {
  case 'mainnet':
    rpcLink = 'https://rpc.ankr.com/fantom';
    break;
  case 'testnet':
    rpcLink = 'https://rpc.ankr.com/fantom_testnet';
    break;
  case 'fakenet':
    rpcLink = 'http://localhost:18545';
    break;
}
let readOnlyProvider = new ethers.JsonRpcProvider(rpcLink, networkId);

let provider: ethers.BrowserProvider | null = null; // null if updateProvider was not called or updateProvider didn't found the provider
let signer: ethers.Signer | null = null;
export async function updateProvider() {
  try {
    let rawProvider = await detectEthereumProvider();
    provider =
      rawProvider == null
        ? null
        : new ethers.BrowserProvider(rawProvider as any, networkId);
    if (provider == null) return;

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: '0x' + networkId.toString(16) },
      ]);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.error.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [
            {
              chainId: '0x' + networkId.toString(16),
              rpcUrls: [rpcLink],
              chainName: 'Fantom ' + NETWORK,
              nativeCurrency: {
                name: 'FTM',
                symbol: 'FTM',
                decimals: 18,
              },
              blockExplorerUrls: null,
            },
          ]);
          await provider.send('wallet_switchEthereumChain', [
            { chainId: '0x' + networkId.toString(16) },
          ]);

          signer = await provider.getSigner();

          return;
        } catch (addError) {
          provider = null;
          return;
        }
        provider = null;
        return;
      }
      provider = null;
      return;
    }

    signer = await provider.getSigner();

    return;
  } catch {
    return;
  }
}
export async function disconnectProvider() {
  provider = null;
  signer = null;
}
export function getProvider() {
  return provider;
}
export function getReadOnlyProvider() {
  return readOnlyProvider;
}
export function getSigner() {
  return signer;
}

export async function* organisationsOfOwner(
  owner: AddressLike,
  orgFactory: OrganisationFactoryContract,
) {
  try {
    for (var i = 0; true; i++) {
      yield await orgFactory.organisationsOfOwner(owner, i);
    }
  } catch {}
}
export async function* registersOfOrganisation(org: OrganisationContract) {
  try {
    for (var i = 0; true; i++) {
      yield await org.registers(i);
    }
  } catch {}
}
export async function getRecord(
  reg: RegisterContract,
  fileHash: DataHexString,
) {
  let rawRecord = await reg.records(fileHash);
  let record: Record = {
    documentHash: rawRecord[0],
    creator: rawRecord[1],
    updater: rawRecord[2],
    sourceDocument: rawRecord[3],
    referenceDocument: rawRecord[4],
    createdAt: rawRecord[5],
    updatedAt: rawRecord[6],
    startsAt: rawRecord[7],
    expiresAt: rawRecord[8],
    pastDocumentHash: rawRecord[9],
    nextDocumentHash: rawRecord[10],
  };
  return record;
}

// if orgFactory has not been passed, then dont check if contract is official
export async function searchForOrganisationOrRegister(
  address: string,
  orgFactory?: OrganisationFactoryContract,
): Promise<[OrganisationContract | RegisterContract, 'org' | 'reg'] | null> {
  let possibleOrganisation = await getOrganisationContract(address);
  if (possibleOrganisation != null) {
    // it is an organisation (possibly, fake)
    if (orgFactory && !(await orgFactory.organisations(address))) {
      return null; // organisation is not official
    }
    return [possibleOrganisation, 'org'];
  }

  let possibleRegister = await getRegisterContract(address);
  if (possibleRegister != null) {
    // it is a register (possibly, fake)
    if (orgFactory) {
      let orgAddress = (await possibleRegister.organisation()).toString();
      let org = await getOrganisationContract(orgAddress);
      if (org == null) return null; // such organisation doesnt exist
      if (!(await orgFactory.organisations(orgAddress))) return null; // organisation of the register is not official
      for (var i = 0; ; i++) {
        try {
          let registerAddress = (await org.registers(i)).toString();
          if (registerAddress == address) break; // register found in the org
        } catch {
          return null; // register is not in the organisation
        }
      }
    }
    return [possibleRegister, 'reg'];
  }

  return null;
}

export async function getOrganisationFactoryContract(
  contractAddress: string,
  skipCheck?: boolean,
) {
  if (!skipCheck) {
    try {
      const bytecode = await readOnlyProvider.getCode(contractAddress);
      if (
        !bytecode.includes(
          toFunctionSelector('deployOrganisation(string,address)'),
        )
      )
        return null;
    } catch {
      return null;
    }
  }
  return new ethers.Contract(
    contractAddress,
    ORGANISATION_FACTORY_ABI,
    signer == null ? readOnlyProvider : signer,
  ) as OrganisationFactoryContract;
}

export async function getOrganisationContract(
  contractAddress: string,
  skipCheck?: boolean,
) {
  if (!skipCheck) {
    try {
      const bytecode = await readOnlyProvider.getCode(contractAddress);
      if (
        !bytecode.includes(
          toFunctionSelector('editOrganisationMetadata(string)'),
        )
      )
        return null;
      if (!bytecode.includes(toFunctionSelector('deployRegister(string)')))
        return null;
    } catch {
      return null;
    }
  }
  return new ethers.Contract(
    contractAddress,
    ORGANISATION_ABI,
    signer == null ? readOnlyProvider : signer,
  ) as OrganisationContract;
}

export async function getRegisterContract(
  contractAddress: string,
  skipCheck?: boolean,
) {
  if (!skipCheck) {
    try {
      const bytecode = await readOnlyProvider.getCode(contractAddress);
      if (
        !bytecode.includes(toFunctionSelector('editRegisterMetadata(string)'))
      ) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return new ethers.Contract(
    contractAddress,
    REGISTER_ABI,
    signer == null ? readOnlyProvider : signer,
  ) as RegisterContract;
}
