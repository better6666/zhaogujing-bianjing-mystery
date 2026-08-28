import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://zhaogujing-relic-oracle.y2993999494.chatgpt.site'),
  title: '照骨镜：汴京失物案 | 国风互动推理',
  description: '用光检、听音和拓印调查一面宋风铜镜，在三名认领者中找出它真正记得的人。',
  openGraph: {
    title: '照骨镜',
    description: '给文物照一张不存在的 X 光片，破解汴京失物奇案。',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: '照骨镜互动小工具' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '照骨镜',
    description: '给文物照一张不存在的 X 光片，破解汴京失物奇案。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
