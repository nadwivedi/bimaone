import { SUPPORT_WHATSAPP_URL } from '../data/contact'

const WhatsAppButton = () => {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      target='_blank'
      rel='noopener noreferrer'
      aria-label='Chat with us on WhatsApp'
      className='fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/40 hover:scale-110 active:scale-95 transition-transform duration-200'
    >
      <span className='absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40' />
      <svg className='relative h-7 w-7 text-white' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z' />
        <path d='M12.001 2C6.478 2 2 6.477 2 12c0 1.86.507 3.681 1.468 5.267L2 22l4.86-1.446A9.97 9.97 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12.001 2zm0 18.222a8.19 8.19 0 01-4.176-1.147l-.3-.178-2.883.858.87-2.82-.195-.29A8.19 8.19 0 013.8 12c0-4.522 3.679-8.2 8.201-8.2 4.521 0 8.2 3.678 8.2 8.2 0 4.522-3.679 8.222-8.2 8.222z' />
      </svg>
    </a>
  )
}

export default WhatsAppButton
