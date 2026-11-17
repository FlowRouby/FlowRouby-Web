import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ServerConnection } from './core/services/server-connection';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly connection = inject(ServerConnection);
}
