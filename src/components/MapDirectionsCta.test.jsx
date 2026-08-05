import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MapDirectionsCta from './map/MapDirectionsCta'

describe('MapDirectionsCta', () => {
  it('renders walk CTA with safe external link attrs', () => {
    render(
      <MapDirectionsCta
        href="https://maps.google.com/?q=1,2"
        label="Ir a pé"
      />,
    )
    const link = screen.getByRole('link', { name: /ir a pé/i })
    expect(link).toHaveAttribute('href', 'https://maps.google.com/?q=1,2')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('uses drive variant styling hook class and fires onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <MapDirectionsCta
        href="https://maps.google.com/?q=1,2"
        label="Conduzir"
        variant="drive"
        onClick={onClick}
      />,
    )
    await user.click(screen.getByRole('link', { name: /conduzir/i }))
    expect(onClick).toHaveBeenCalled()
  })
})
