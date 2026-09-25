import { Beaker24Regular } from '@fluentui/react-icons'

export const tools = [
  {
    name: 'Bradford assay',
    description: 'Parse a 96-well plate, fit a quadratic standards curve, and calculate protein concentrations.',
    route: '/bradford',
    category: 'Protein analysis',
    status: 'Available',
    icon: Beaker24Regular,
  },
] as const

