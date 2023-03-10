import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import styles from '@/styles/Header.module.scss';
import { Search, Menu2 } from 'tabler-icons-react';
import {
  Button,
  TextInput,
  ActionIcon,
  Drawer,
  Group,
  Modal,
  Notification,
} from '@mantine/core';

import CreateOrganisationForm from './forms/CreateOrganisationForm';
import UpdateOrganisationForm from './forms/UpdateOrganisationForm';
import DeployRegisterForm from './forms/DeployRegisterForm';
import CreateRecordForm from './forms/CreateRecordForm';
import UpdateRegisterForm from './forms/UpdateRegisterForm';
import InvalidateRecordForm from './forms/InvalidateRecordForm';

import { update as updateOrganisationPage } from '@/pages/organisations/[id]';
import { update as updateRegisterPage } from '@/pages/organisations/[id]/[regAddr]';

import {
  searchForOrganisationOrRegister,
  OrganisationFactoryContract,
  getOrganisationContract,
  getRegisterContract,
  getSigner,
  RECORD_CREATOR_ROLE,
  RECORD_INVALIDATOR_ROLE,
  REGISTER_EDITOR_ROLE,
} from '@/contract_interactions';

export default function HeaderMenu({
  walletConnected,
}: {
  walletConnected: boolean;
}) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const isHomePage = router.pathname === '/';
  const isOrganisationsPage = router.pathname === '/organisations';
  const isOrganisationPage = /\/organisations\/.+/.test(router.pathname);
  const isRegisterPage = /\/organisations\/.+\/.+/.test(router.pathname);
  const [orgModalOpened, setOrgModalOpened] = useState(false);
  const [regModalOpened, setRegModalOpened] = useState(false);
  const [createRecModalOpened, setCreateRecModalOpened] = useState(false);
  const [invaliRecModalOpened, setInvaliRecModalOpened] = useState(false);

  const [orgFactory, setOrgFactory] = useState<
    OrganisationFactoryContract | undefined
  >(undefined);
  const [contractAddr, setContractAddr] = useState({
    address: '',
  });
  const [searchAlert, setSearchAlert] = useState(false);
  const orgAddress = isOrganisationPage
    ? router.query.id
      ? typeof router.query.id == 'string'
        ? router.query.id
        : router.query.id[0]
      : null
    : null;
  const regAddress = isRegisterPage
    ? router.query.regAddr
      ? typeof router.query.regAddr == 'string'
        ? router.query.regAddr
        : router.query.regAddr[0]
      : null
    : null;

  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [regPermissions, setRegPermissions] = useState({
    recordCreator: false,
    recordInvalidator: false,
    registerEditor: false,
  });

  useEffect(() => {
    if (!walletConnected) setIsOrgOwner(false);
    if (!orgAddress) {
      setIsOrgOwner(false);
      return;
    }
    (async () => {
      let signer = await getSigner();
      if (!signer) {
        setIsOrgOwner(false);
        return;
      }
      let address = await signer.getAddress();
      let org = await getOrganisationContract(orgAddress);
      if (!org) {
        setIsOrgOwner(false);
        return;
      }
      setIsOrgOwner((await org.owner()).toString() == address);
    })();
    return () => {
      //unmount
    };
  }, [walletConnected, orgAddress]);

  useEffect(() => {
    if (!walletConnected)
      setRegPermissions({
        recordCreator: false,
        recordInvalidator: false,
        registerEditor: false,
      });
    if (!regAddress) {
      setRegPermissions({
        recordCreator: false,
        recordInvalidator: false,
        registerEditor: false,
      });
      return;
    }
    (async () => {
      let signer = await getSigner();
      if (!signer) {
        setRegPermissions({
          recordCreator: false,
          recordInvalidator: false,
          registerEditor: false,
        });
        return;
      }
      let address = await signer.getAddress();
      let reg = await getRegisterContract(regAddress);
      if (!reg) {
        setRegPermissions({
          recordCreator: false,
          recordInvalidator: false,
          registerEditor: false,
        });
        return;
      }
      setRegPermissions({
        recordCreator: await reg.hasRole(RECORD_CREATOR_ROLE, address),
        recordInvalidator: await reg.hasRole(RECORD_INVALIDATOR_ROLE, address),
        registerEditor: await reg.hasRole(REGISTER_EDITOR_ROLE, address),
      });
    })();
    return () => {
      // unmount
    };
  }, [walletConnected, regAddress]);

  return (
    <div>
      <div className={styles.header__burger}>
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          title='Menu'
          padding='xl'
          size='xl'
          position='right'
        >
          <ActionIcon
            className={styles.search__button}
            onClick={async () => {
              if (
                (await searchForOrganisationOrRegister(
                  contractAddr.address,
                  orgFactory,
                )) != null
              ) {
                router.push('/organisations/' + contractAddr.address);
              } else {
                setSearchAlert(true);
              }
            }}
          >
            <Search />
          </ActionIcon>
          <TextInput
            icon={<Search />}
            placeholder='Enter Org or Reg address'
            radius='md'
            size='md'
            onChange={(event) =>
              setContractAddr({ address: event.target.value })
            }
            onKeyDown={async (event) => {
              if (event.key === 'Enter') {
                if (
                  (await searchForOrganisationOrRegister(
                    contractAddr.address,
                    orgFactory,
                  )) != null
                ) {
                  router.push('/organisations/' + contractAddr.address);
                } else {
                  setSearchAlert(true);
                }
              }
            }}
          />
          {searchAlert ? (
            <Notification
              sx={{ marginTop: '10px' }}
              color='red'
              title='Alert'
              onClose={() => setSearchAlert(false)}
            >
              Organisation or Register not found.
            </Notification>
          ) : null}
          {isHomePage ? null : null}
          {isOrganisationsPage && walletConnected ? (
            <div className={styles.header__mobile_menu}>
              <Button
                radius='md'
                onClick={() => {
                  setOrgModalOpened(true);
                }}
              >
                Create Organisation
              </Button>
              <Modal
                opened={orgModalOpened}
                onClose={() => setOrgModalOpened(false)}
                title='To create Organisation fill in the forms please.'
              >
                <CreateOrganisationForm
                  update={() => setOrgModalOpened(false)}
                />
              </Modal>
            </div>
          ) : null}
          {isOrganisationPage &&
          orgAddress &&
          !isRegisterPage &&
          walletConnected ? (
            <div className={styles.header__mobile_menu}>
              <Button
                radius='md'
                onClick={() => {
                  setOrgModalOpened(true);
                }}
                disabled={!isOrgOwner}
              >
                Update Organisation
              </Button>
              <Modal
                opened={orgModalOpened}
                onClose={() => setOrgModalOpened(false)}
                title='Fill in the forms you want to update.'
              >
                <UpdateOrganisationForm
                  orgAddress={orgAddress}
                  update={() => updateOrganisationPage()}
                  updateModal={() => setOrgModalOpened(false)}
                />
              </Modal>
              <Button
                radius='md'
                onClick={() => setRegModalOpened(true)}
                disabled={!isOrgOwner}
              >
                Deploy Register
              </Button>
              <Modal
                opened={regModalOpened}
                onClose={() => setRegModalOpened(false)}
                title='To create Register fill in the forms'
              >
                <DeployRegisterForm
                  orgAddress={orgAddress}
                  update={() => updateOrganisationPage()}
                  updateModal={() => setRegModalOpened(false)}
                />
              </Modal>
            </div>
          ) : null}
          {isRegisterPage && walletConnected ? (
            <div className={styles.header__mobile_menu}>
              <Button
                radius='md'
                onClick={() => setCreateRecModalOpened(true)}
                disabled={!regPermissions.recordCreator}
              >
                Create Record
              </Button>
              <Modal
                size='lg'
                opened={createRecModalOpened}
                onClose={() => setCreateRecModalOpened(false)}
                title='To create Record fill in the forms'
              >
                <CreateRecordForm
                  updateModal={() => setCreateRecModalOpened(false)}
                  update={() => updateRegisterPage()}
                  registerAddress={regAddress ?? ''}
                />
              </Modal>
              <Button
                radius='md'
                onClick={() => setInvaliRecModalOpened(true)}
                disabled={!regPermissions.recordInvalidator}
              >
                Invalidate Record
              </Button>
              <Modal
                opened={invaliRecModalOpened}
                onClose={() => setInvaliRecModalOpened(false)}
                title='To invalidate Record fill in the forms'
              >
                <InvalidateRecordForm
                  updateModal={() => setInvaliRecModalOpened(false)}
                  update={() => updateRegisterPage()}
                  registerAddress={regAddress ?? ''}
                />
              </Modal>
              <Button
                radius='md'
                onClick={() => setRegModalOpened(true)}
                disabled={!regPermissions.registerEditor}
              >
                Update Register
              </Button>
              <Modal
                opened={regModalOpened}
                onClose={() => setRegModalOpened(false)}
                title='Fill in the forms you want to update.'
              >
                <UpdateRegisterForm
                  update={() => updateRegisterPage()}
                  regAddress={regAddress ?? ''}
                  updateModal={() => setRegModalOpened(false)}
                />
              </Modal>
            </div>
          ) : null}
        </Drawer>
        <Group position='center'>
          <Button onClick={() => setOpened(true)} variant='subtle' compact>
            <Menu2 size={25} />
          </Button>
        </Group>
      </div>
    </div>
  );
}
