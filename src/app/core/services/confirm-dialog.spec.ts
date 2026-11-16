import { TestBed } from '@angular/core/testing';
import Swal from 'sweetalert2';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  const request = { title: '¿Limpiar el diagrama?', text: 'Se perderá.', confirmText: 'Limpiar' };
  const open = () => TestBed.inject(ConfirmDialog).confirm(request);

  beforeAll(() => {
    // jsdom has no matchMedia, which SweetAlert2 reads to pick its colour scheme.
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  });

  afterAll(() => vi.unstubAllGlobals());

  afterEach(() => Swal.close());

  it('shows the title, the text and both buttons in Spanish', async () => {
    void open();
    await vi.waitFor(() => expect(Swal.getPopup()).not.toBeNull());

    expect(Swal.getTitle()?.textContent).toBe('¿Limpiar el diagrama?');
    expect(Swal.getHtmlContainer()?.textContent).toBe('Se perderá.');
    expect(Swal.getConfirmButton()?.textContent).toBe('Limpiar');
    expect(Swal.getCancelButton()?.textContent).toBe('Cancelar');
  });

  it('resolves to true when the user confirms', async () => {
    const answer = open();
    await vi.waitFor(() => expect(Swal.getPopup()).not.toBeNull());
    Swal.clickConfirm();

    expect(await answer).toBe(true);
  });

  it('resolves to false when the user cancels', async () => {
    const answer = open();
    await vi.waitFor(() => expect(Swal.getPopup()).not.toBeNull());
    Swal.clickCancel();

    expect(await answer).toBe(false);
  });

  it('resolves to false when the dialog is closed without choosing', async () => {
    const answer = open();
    await vi.waitFor(() => expect(Swal.getPopup()).not.toBeNull());
    Swal.close();

    expect(await answer).toBe(false);
  });
});
