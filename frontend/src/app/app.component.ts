import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FormBuilder, FormGroup } from '@angular/forms';

interface Product {
  name: string;
  image: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  searchForm: FormGroup;
  searchMethod: 'text' | 'image' = 'text';
  loading = false;
  products: Product[] = [];
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isDragging = false;
  searchPerformed = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.searchForm = this.fb.group({
      textQuery: [''],
    });
  }

  setSearchMethod(method: 'text' | 'image'): void {
    this.searchMethod = method;
    this.clearFile();
    this.searchForm.get('textQuery')?.setValue('');
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const file = event.dataTransfer?.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  handleFile(file: File): void {
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  onSubmit(): void {
    if (this.loading) return;

    this.loading = true;
    this.searchPerformed = true;
    const formData = new FormData();

    if (this.searchMethod === 'text') {
      const textQuery = this.searchForm.get('textQuery')?.value;
      if (!textQuery?.trim()) return;
      formData.append('textQuery', textQuery);
    } else if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    } else {
      return;
    }

    this.http
      .post<{ success: boolean; products: Product[] }>(
        'http://localhost:3000/api/v1/search-products',
        formData
      )
      .subscribe({
        next: (response) => {
          this.products = response.products;
          this.loading = false;
        },
        error: (error) => {
          console.error('Search failed:', error);
          this.loading = false;
          this.products = [];
        },
      });
  }
}
