/**
 * Bank Image Gallery
 * Responsive grid of bank screenshots/images with modal preview
 */

import { useState } from 'react';
import { Card, Text, SimpleGrid, Image, Modal, UnstyledButton } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';

interface BankImageGalleryProps {
  images: string[];
  bankName?: string;
}

export function BankImageGallery({ images, bankName }: BankImageGalleryProps) {
  const [opened, setOpened] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  if (!images || images.length === 0) return null;

  const openImage = (path: string) => {
    setSelectedImage(`/api/loan-images/${path}`);
    setOpened(true);
  };

  return (
    <>
      <Card withBorder radius="md">
        <Text fw={600} size="md" c={rallyColors.textPrimary} mb="md">
          <IconPhoto size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
          تصاویر و اسکرین‌شات‌ها
          <Text span size="sm" c={rallyColors.textDimmed} mr="xs">
            {' '}({images.length} تصویر)
          </Text>
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          {images.map((path) => (
            <UnstyledButton key={path} onClick={() => openImage(path)}>
              <Image
                src={`/api/loan-images/${path}`}
                alt={bankName || 'تصویر بانک'}
                radius="sm"
                h={140}
                fit="cover"
                style={{
                  border: `1px solid ${rallyColors.glassBorder}`,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%231a1b1e' width='100' height='100'/%3E%3Ctext fill='%23555' x='50' y='55' text-anchor='middle' font-size='14'%3ENo image%3C/text%3E%3C/svg%3E"
              />
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        size="xl"
        centered
        withCloseButton
        title={bankName || 'پیش‌نمایش تصویر'}
        styles={{
          body: { padding: 0 },
        }}
      >
        <Image
          src={selectedImage}
          alt={bankName || 'تصویر بانک'}
          fit="contain"
          mah="80vh"
        />
      </Modal>
    </>
  );
}
