import { icons } from '../data/features'

const Icon = ({ name, className = 'h-5 w-5', strokeWidth = 2 }) => (
  <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={strokeWidth} d={icons[name]} />
  </svg>
)

export default Icon
