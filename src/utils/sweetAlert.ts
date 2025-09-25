import Swal from 'sweetalert2';

export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: '#1c3c80',
    timer: 3000,
    timerProgressBar: true
  });
};

export const showError = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#1c3c80'
  });
};

export const showWarning = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#1c3c80'
  });
};

export const showInfo = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonColor: '#1c3c80'
  });
};

export const showConfirm = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#1c3c80',
    cancelButtonColor: '#ef4444',
    confirmButtonText: 'Yes, proceed!',
    cancelButtonText: 'Cancel'
  });
};

export const showLoading = (title: string = 'Processing...') => {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

export const closeLoading = () => {
  Swal.close();
};
export const showAlert = (title: string, text?: string, icon: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonColor: '#1c3c80',
    timer: icon === 'success' ? 3000 : undefined,
    timerProgressBar: icon === 'success'
  });
};