import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Image,
  Text,
  Badge,
  Button,
  Spoiler,
  Stack,
  Group,
} from '@mantine/core';
import Link from 'next/link';
import styles from '@/styles/Form.module.scss';

function hashString(str: string) {
  let hash = 0;
  if (str.length == 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

const images = [
  '/image1.jpg',
  '/image2.jpg',
  '/image3.jpg',
  '/image4.jpg',
  '/image5.jpg',
  '/image6.jpg',
  '/image7.jpg',
  '/image8.jpg',
  '/image9.jpg',
  '/image10.jpg',
];

export default function MyCard(props: {
  title: string;
  description: string;
  banner?: string;
  link?: string;
  phone?: string;
  email?: string;
  badge?: string;
  badge2?: [string, string];
  way?: string;
}) {
  const { title, description, banner, link, phone, email, badge, badge2, way } =
    props;

  const router = useRouter();
  const isOrganisationsPage = router.pathname === '/organisations';
  const isHomePage = router.pathname === '/';

  const randomIndex = hashString(title);
  const randomImage = images[randomIndex % images.length];
  const [imageError, setImageError] = useState(false);
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Card shadow='sm' p='lg' radius='md' withBorder className={styles.card}>
      <Card.Section>
        {banner ? (
          <Image
            className={styles.banner}
            src={banner}
            height={160}
            alt='Card'
            onError={handleImageError}
          />
        ) : (
          <Image src={randomImage} height={160} alt='Card' />
        )}
        {imageError ? (
          <Image src={randomImage} height={160} alt='Card' />
        ) : null}
      </Card.Section>
      <div className={styles.card__body}>
        <Stack mt='md' mb='xs' align='flex-start'>
          <Group spacing='xs'>
            {badge != undefined ? (
              <Badge color='pink' variant='light'>
                {badge}
              </Badge>
            ) : null}
            {badge2 != undefined ? (
              <Badge color={badge2[1]} variant='light'>
                {badge2[0]}
              </Badge>
            ) : null}
          </Group>
          <Text fz='xl' weight={600}>
            {title}
          </Text>
        </Stack>
        {isOrganisationsPage || isHomePage ? (
          <Spoiler maxHeight={150} showLabel='Show more' hideLabel='Hide'>
            <Text
              size='md'
              color='dimmed'
              sx={{ overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {description}
            </Text>
            {link || phone || email ? (
              <div className={styles.contacts}>
                <Text
                  className={styles.contacts__title}
                  size='lg'
                  color='dimmed'
                  sx={{ overflowWrap: 'break-word' }}
                >
                  Contacts:
                </Text>
                {link ? (
                  <Link
                    target='_blank'
                    className={styles.link}
                    href={link.toString()}
                  >
                    Link: {link.toString()}
                  </Link>
                ) : null}
                {phone ? (
                  <Text size='sm' color='dimmed'>
                    Phone: {phone}
                  </Text>
                ) : null}
                {email ? (
                  <Text size='sm' color='dimmed'>
                    Email: {email}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </Spoiler>
        ) : (
          <div>
            <Text
              size='md'
              color='dimmed'
              sx={{ overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {description}
            </Text>
            {link || phone || email ? (
              <div className={styles.contacts}>
                <Text
                  className={styles.contacts__title}
                  size='lg'
                  color='dimmed'
                  sx={{ overflowWrap: 'break-word' }}
                >
                  Contacts:
                </Text>
                {link ? (
                  <Link
                    target='_blank'
                    className={styles.link}
                    href={link.toString()}
                  >
                    Link: {link.toString()}
                  </Link>
                ) : null}
                {phone ? (
                  <Text size='sm' color='dimmed'>
                    Phone: {phone}
                  </Text>
                ) : null}
                {email ? (
                  <Text size='sm' color='dimmed'>
                    Email: {email}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {way != undefined ? (
        <Link href={way} className={styles.btn}>
          <Button variant='light' color='blue' fullWidth mt='md' radius='md'>
            View
          </Button>
        </Link>
      ) : null}
    </Card>
  );
}
