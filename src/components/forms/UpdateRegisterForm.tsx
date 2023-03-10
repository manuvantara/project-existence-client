import {
  getOrganisationContract,
  getProvider,
  getRegisterContract,
  getSigner,
} from '@/contract_interactions';
import { serializeMetadata } from '@/utils';
import {
  Button,
  LoadingOverlay,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import React, { useEffect } from 'react';
import { useState } from 'react';
import {
  TextColor,
  TextCaption,
  BrandMailgun,
  Check,
  X,
  Phone,
  ExternalLink,
  PictureInPictureOff,
} from 'tabler-icons-react';
import { showNotification, updateNotification } from '@mantine/notifications';
import { parseMetadata, waitFor, type Metadata } from '@/utils';
const emailRegex = /^\S+@\S+\.\S+$/; // This is a basic email regex pattern, modify it as needed
const phoneRegex = /^\+\d+$/;
const imageRegex = /\bhttps?:\/\/\S+?\.(?:jpg|jpeg|png|gif|svg)\b/i;
const linkRegex = /\bhttps?:\/\/\S+\b/i;

export default function UpdateRegisterForm(props: {
  regAddress: string;
  update?: () => any;
  updateModal: () => any;
}) {
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
  const [buttonContent, setButtonContent] = useState([
    <>Update Register</>,
    true,
  ] as [JSX.Element, boolean]);

  const [regMetadata, setRegMetadata] = useState({} as Metadata);

  const fetchData = async () => {
    let reg = await getRegisterContract(props.regAddress);
    if (!reg) {
      return;
    }
    let rawMetadata = await reg.metadata();
    setRegMetadata(parseMetadata(rawMetadata));
  };
  useEffect(() => {
    let isMounted = true;

    if (isMounted) fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (regMetadata.name && regMetadata.description && regMetadata.contacts) {
      setFormInput({
        name: regMetadata.name,
        description: regMetadata.description,
        banner: regMetadata.banner || '',
        contacts: {
          link: regMetadata.contacts.link || '',
          phone: regMetadata.contacts.phone || '',
          email: regMetadata.contacts.email || '',
        },
      });
    }
  }, [regMetadata]);

  return (
    <Stack>
      <TextInput
        icon={<TextColor />}
        placeholder='Register name'
        label='Register name'
        defaultValue={regMetadata.name ?? ''}
        value={formInput.name ?? ''}
        onChange={(event) =>
          setFormInput({
            ...formInput,
            name: event.currentTarget.value,
          })
        }
      />
      <Textarea
        icon={<TextCaption />}
        defaultValue={regMetadata.description ?? ''}
        value={formInput.description ?? ''}
        placeholder='Register description'
        label='Register description'
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
        defaultValue={regMetadata.banner ?? ''}
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
          defaultValue={regMetadata.contacts?.link ?? ''}
          value={formInput.contacts?.link ?? ''}
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
          defaultValue={regMetadata.contacts?.phone ?? ''}
          value={formInput.contacts?.phone ?? ''}
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
          defaultValue={regMetadata.contacts?.email ?? ''}
          value={formInput.contacts?.email ?? ''}
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
          props.updateModal();
          showNotification({
            id: 'load-data',
            loading: true,
            title: 'Updating register...',
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

          let reg = await getRegisterContract(props.regAddress);
          if (reg == null) {
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
            let tx = await reg.editRegisterMetadata(rawMetadata);
            if (tx.hash == null) return;
            await getProvider()?.waitForTransaction(tx.hash);
            updateNotification({
              id: 'load-data',
              color: 'teal',
              title: 'Register was successfully updated',
              message:
                'Notification will close in 2 seconds, you can close this notification now',
              icon: <Check />,
              autoClose: 5000,
            });
            if (props.update) props.update();
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
        }}
      >
        {buttonContent[0]}
      </Button>
    </Stack>
  );
}
