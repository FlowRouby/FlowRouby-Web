import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'editor',
    loadChildren: () =>
      import('./features/process-editor/process-editor.routes').then((m) => m.processEditorRoutes),
  },
  { path: '', pathMatch: 'full', redirectTo: 'editor' },
];
