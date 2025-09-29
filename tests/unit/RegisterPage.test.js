import React from 'react';
import { render, screen } from '@testing-library/react';
import RegisterPage from '@/app/register/page';

describe('Register page', () => {
  it('renders heading', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
  });
});
