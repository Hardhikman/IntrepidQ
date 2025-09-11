// frontend/components/ImageCard.tsx

import Image from 'next/image';

interface ImageCardProps {
    src: string;
    alt: string;
    caption?: string;
}

const ImageCard: React.FC<ImageCardProps> = ({ src, alt, caption }) => (
    <div className="image-card max-w-full">
        <Image 
            src={src} 
            alt={alt} 
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: '100%', height: 'auto' }}
            className="rounded-lg shadow-md"
        />
        {caption && <p className="caption text-center mt-2 text-gray-600 italic">{caption}</p>}
    </div>
);

export default ImageCard;