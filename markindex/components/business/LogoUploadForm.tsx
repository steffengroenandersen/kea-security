"use client";

import { useState } from "react";
import { uploadBusinessLogo } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LogoUploadFormProps {
  businessUuid: string;
  currentLogoUrl?: string | null;
}

export function LogoUploadForm({
  businessUuid,
  currentLogoUrl,
}: LogoUploadFormProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    // Client-side validation (UX only, not security)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("File must be less than 5MB");
      setPreviewUrl(null);
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Only PNG and JPG files are allowed");
      setPreviewUrl(null);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setError(""); // Clear any previous errors
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await uploadBusinessLogo(formData, businessUuid);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
        setPreviewUrl(null); // Clear preview
        // Reset file input
        const form = e.currentTarget;
        form.reset();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Business Logo</CardTitle>
        <CardDescription>
          Upload a logo for your business (PNG or JPG, max 5MB)
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/50 rounded-md">
              Logo uploaded successfully
            </div>
          )}

          {/* Current logo display */}
          {currentLogoUrl && !previewUrl && (
            <div className="space-y-2">
              <Label>Current Logo</Label>
              <img
                src={currentLogoUrl}
                alt="Current business logo"
                className="w-32 h-32 rounded object-cover border"
              />
            </div>
          )}

          {/* Preview new upload */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <img
                src={previewUrl}
                alt="Logo preview"
                className="w-32 h-32 rounded object-cover border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="logo">Choose Logo Image</Label>
            <Input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-zinc-500">PNG or JPG, max 5MB</p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Uploading..." : "Upload Logo"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
