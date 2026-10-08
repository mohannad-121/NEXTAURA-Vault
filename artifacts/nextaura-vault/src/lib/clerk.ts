import { dark } from '@clerk/themes';
import { asset, basePath } from './brand';

export const clerkAppearance = {
  theme: dark,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${asset('brands/NEXTAURA_AGENCY_1791477261098.png')}`,
  },
  variables: {
    colorPrimary: '#d4b068',
    colorForeground: '#f1ebe0',
    colorMutedForeground: '#a79f92',
    colorDanger: '#e5604f',
    colorBackground: '#110f0c',
    colorInput: '#1a1713',
    colorInputForeground: '#f1ebe0',
    colorNeutral: '#d9cdb5',
    fontFamily: "'Manrope', system-ui, sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#110f0c]/90 backdrop-blur-xl rounded-3xl w-[440px] max-w-full overflow-hidden border border-[#d4b068]/25 shadow-2xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    logoBox: 'h-24 justify-center overflow-hidden',
    logoImage: 'h-40 w-40 max-w-none object-contain mix-blend-screen',
    headerTitle: { fontFamily: "'Instrument Serif', serif", fontSize: '1.9rem', fontWeight: 400, color: '#f1ebe0' },
    headerSubtitle: { color: '#a79f92' },
    formFieldLabel: { color: '#d9d0c0' },
    footerActionText: { color: '#a79f92' },
    footerActionLink: { color: '#d4b068' },
    dividerText: { color: '#a79f92' },
    formButtonPrimary: { background: '#d4b068', color: '#17120a', fontWeight: 600 },
    socialButtonsBlockButton: { borderColor: '#2c2720' },
    socialButtonsBlockButtonText: { color: '#f1ebe0' },
    identityPreviewEditButton: { color: '#d4b068' },
    formFieldSuccessText: { color: '#7fcf9f' },
    alertText: { color: '#f1ebe0' },
  },
};
