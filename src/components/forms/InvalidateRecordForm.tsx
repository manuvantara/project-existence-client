import { ORGANISATION_FACTORY_ADDRESS } from '@/config';
import {
  getOrganisationFactoryContract,
  getProvider,
  getRegisterContract,
  getSigner,
} from '@/contract_interactions';
import { serializeMetadata } from '@/utils';
import { Button, Stack, TextInput, Text, FileInput } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { showNotification, updateNotification } from '@mantine/notifications';
import { useState } from 'react';
import {
  Hash,
  FileSymlink,
  ExternalLink,
  FileTime,
  Check,
  FileUpload,
  X,
} from 'tabler-icons-react';
import { useRouter } from 'next/router';
import styles from '@/styles/Register.module.scss';
import { sha256 } from 'crypto-hash';

export default function InvalidateRecordForm(props: {
  updateModal: () => any;
  update: () => any;
  registerAddress: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [buttonContent, setButtonContent] = useState([
    <>Invalidate Record</>,
    true,
  ] as [JSX.Element, boolean]);
  const [formInput, setFormInput] = useState({
    documentHash: '',
  });
  const [docHash, setDocHash] = useState('');
  const [docExists, setDocExists] = useState(false);

  function handleDrop(file: File) {
    setDocExists(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileContents = new Uint8Array(event?.target?.result as ArrayBuffer);

      let hash = await sha256(fileContents);
      hash = '0x' + hash;
      setDocHash(hash);
      setFormInput({ ...formInput, documentHash: hash });
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <Stack>
      <FileInput
        label='Upload Document'
        placeholder='Upload Document'
        icon={<FileUpload />}
        onChange={(file) => {
          file ? handleDrop(file) : console.log('no file');
        }}
      />
      <TextInput
        icon={<Hash />}
        withAsterisk
        placeholder='Document hash'
        label='Document hash'
        defaultValue={docHash}
        disabled={docExists}
        onChange={(event) =>
          setFormInput({
            ...formInput,
            documentHash: event.currentTarget.value,
          })
        }
      />
      <Button
        radius='md'
        color='red'
        disabled={formInput.documentHash.trim() == ''}
        onClick={async (e) => {
          props.updateModal();
          showNotification({
            id: 'load-data',
            loading: true,
            title: 'Invalidating record...',
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

          let reg = await getRegisterContract(props.registerAddress);
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

          try {
            let tx = await reg.invalidateRecord(formInput.documentHash);
            if (tx.hash == null) return;

            await getProvider()?.waitForTransaction(tx.hash);
            updateNotification({
              id: 'load-data',
              color: 'teal',
              title: 'Record was successfully invalidated',
              message:
                'Notification will close in 2 seconds, you can close this notification now',
              icon: <Check />,
              autoClose: 5000,
            });
            props.update();
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
