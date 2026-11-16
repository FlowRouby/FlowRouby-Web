import { Service } from '@angular/core';
import Swal from 'sweetalert2';

export interface ConfirmRequest {
  title: string;
  text: string;
  /** Label of the button that goes ahead. */
  confirmText: string;
}

const BUTTON = 'rounded-control px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-focus-ring';

/** Asks the user to confirm an action that cannot be undone. The only place that knows about SweetAlert2. */
@Service()
export class ConfirmDialog {
  /** Resolves to true only when the user chose to go ahead; closing or cancelling resolves to false. */
  async confirm(request: ConfirmRequest): Promise<boolean> {
    const result = await Swal.fire({
      title: request.title,
      text: request.text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: request.confirmText,
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      reverseButtons: true,
      // Buttons follow the application theme instead of the library defaults.
      buttonsStyling: false,
      customClass: {
        popup: 'font-sans',
        title: 'text-lg text-content',
        htmlContainer: 'text-sm text-content-muted',
        actions: 'gap-2',
        confirmButton: `${BUTTON} bg-primary text-on-primary hover:bg-primary-hover`,
        cancelButton: `${BUTTON} border border-border text-content hover:bg-primary-soft`,
      },
    });
    return result.isConfirmed;
  }
}
