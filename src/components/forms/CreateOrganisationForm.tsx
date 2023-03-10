import { ORGANISATION_FACTORY_ADDRESS } from '@/config';
import {
  getSigner,
  getOrganisationFactoryContract,
  getProvider,
} from '@/contract_interactions';
import { serializeMetadata } from '@/utils';
import {
  TextInput,
  Button,
  LoadingOverlay,
  Stack,
  Textarea,
} from '@mantine/core';
import React, { useState } from 'react';
import {
  BrandMailgun,
  TextCaption,
  TextColor,
  Check,
  Cross,
  X,
  Phone,
  ExternalLink,
  PictureInPictureOff,
} from 'tabler-icons-react';
import { showNotification, updateNotification } from '@mantine/notifications';
import { update } from '@/pages/organisations/[id]';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { updateHome } from '@/pages';
import { updateOrganisations } from '@/pages/organisations';

const emailRegex = /^\S+@\S+\.\S+$/; // This is a basic email regex pattern, modify it as needed
const phoneRegex = /^\+\d+$/;
const imageRegex = /\bhttps?:\/\/\S+?\.(?:jpg|jpeg|png|gif|svg)\b/i;
const linkRegex = /\bhttps?:\/\/\S+\b/i;

export default function CreateOrganisationForm(props: { update: () => any }) {
  const router = useRouter();
  const isHomePage = router.pathname === '/';
  const [buttonContent, setButtonContent] = useState([
    <>Create Organisation</>,
    true,
  ] as [JSX.Element, boolean]);
  const [formInput, setFormInput] = useState({
    name: '',
    description: '',
    banner: '',
    contacts: {
      link: '',
      phone: '',
      email: '',
    },
  });
  return (
    <Stack>
      <TextInput
        icon={<TextColor />}
        withAsterisk
        placeholder='Organisation name'
        label='Organisation name'
        onChange={(event) =>
          setFormInput({
            ...formInput,
            name: event.currentTarget.value,
          })
        }
      />

      <Textarea
        icon={<TextCaption />}
        withAsterisk
        placeholder='Organisation description'
        label='Organisation description'
        onChange={(event) =>
          setFormInput({
            ...formInput,
            description: event.currentTarget.value,
          })
        }
      />
      <TextInput
        sx={{ marginTop: '5px' }}
        icon={<PictureInPictureOff />}
        placeholder='Logo/Banner'
        label='Logo/Banner'
        onChange={(event) =>
          setFormInput({
            ...formInput,
            banner: event.currentTarget.value,
          })
        }
      />
      <div>
        Contacts
        <TextInput
          icon={<ExternalLink />}
          placeholder='Link'
          label='Link'
          onChange={(event) =>
            setFormInput({
              ...formInput,
              contacts: {
                ...formInput.contacts,
                link: event.currentTarget.value,
              },
            })
          }
        />
        <TextInput
          sx={{ marginTop: '5px' }}
          icon={<Phone />}
          placeholder='Phone'
          label='Phone'
          onChange={(event) =>
            setFormInput({
              ...formInput,
              contacts: {
                ...formInput.contacts,
                phone: event.currentTarget.value,
              },
            })
          }
        />
        <TextInput
          sx={{ marginTop: '5px' }}
          icon={<BrandMailgun />}
          placeholder='Email'
          label='Email'
          onChange={(event) =>
            setFormInput({
              ...formInput,
              contacts: {
                ...formInput.contacts,
                email: event.currentTarget.value,
              },
            })
          }
        />
      </div>

      <Button
        radius='md'
        color='red'
        disabled={
          formInput.name.trim() == '' ||
          formInput.description.trim() == '' ||
          (emailRegex.test(formInput.contacts.email) == false &&
            formInput.contacts.email.trim() != '') ||
          (phoneRegex.test(formInput.contacts.phone) == false &&
            formInput.contacts.phone.trim() != '') ||
          (linkRegex.test(formInput.contacts.link) == false &&
            formInput.contacts.link.trim() != '') ||
          (imageRegex.test(formInput.banner) == false &&
            formInput.banner.trim() != '')
        }
        onClick={async (e) => {
          props.update();
          showNotification({
            id: 'load-data',
            loading: true,
            title: 'Creating organisation...',
            message: 'You cannot close this notification yet',
            autoClose: false,
            withCloseButton: false,
          });

          let signer = getSigner();
          if (signer == null) {
            showNotification({
              title: 'Error',
              color: 'red',
              message: 'Please connect your wallet!',
              autoClose: 5000,
            });
            updateNotification({
              id: 'load-data',
              message:
                'Notification will close in 2 seconds, you can close this notification now',
              autoClose: 5000,
            });
            return;
          }
          let orgFactory = await getOrganisationFactoryContract(
            ORGANISATION_FACTORY_ADDRESS,
          );
          if (orgFactory == null) {
            showNotification({
              title: 'Error',
              color: 'red',
              message: 'An error occured.',
              autoClose: 5000,
            });
            updateNotification({
              id: 'load-data',
              message:
                'Notification will close in 2 seconds, you can close this notification now',
              autoClose: 5000,
            });
            return;
          }

          let rawMetadata = serializeMetadata(formInput);
          try {
            let tx = await orgFactory.deployOrganisation(
              rawMetadata,
              await signer.getAddress(),
            );
            if (tx.hash == null) return;
            await getProvider()?.waitForTransaction(tx.hash);

            setTimeout(() => {
              updateNotification({
                id: 'load-data',
                color: 'teal',
                title: 'Organisation was successfully created',
                message:
                  'Notification will close in 2 seconds, you can close this notification now',
                icon: <Check />,
                autoClose: 5000,
              });
            }, 3000);
          } catch (error: any) {
            switch (error.code as string) {
              case 'ACTION_REJECTED':
                updateNotification({
                  id: 'load-data',
                  color: 'red',
                  title: 'Transaction rejected by user.',
                  message:
                    'Notification will close in 2 seconds, you can close this notification now',
                  icon: <X />,
                  autoClose: 5000,
                });
                break;
              case 'CALL_EXCEPTION':
                updateNotification({
                  id: 'load-data',
                  color: 'red',
                  title: 'Transaction rejected: ' + error.reason,
                  message:
                    'Notification will close in 2 seconds, you can close this notification now',
                  icon: <X />,
                  autoClose: 5000,
                });
                break;
              default:
                updateNotification({
                  id: 'load-data',
                  color: 'red',
                  title: 'Transaction error.',
                  message:
                    'Notification will close in 2 seconds, you can close this notification now',
                  icon: <X />,
                  autoClose: 5000,
                });
                break;
            }
          }
          if (isHomePage) {
            updateHome();
          } else {
            updateOrganisations();
            router.push('/organisations');
          }
        }}
      >
        {buttonContent[0]}
      </Button>
    </Stack>
  );
}
