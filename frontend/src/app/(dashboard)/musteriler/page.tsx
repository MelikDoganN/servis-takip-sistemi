"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { customerService } from "@/services/customerService";
import { Customer } from "@/types/customer";
import { ApiError } from "@/types/api";

export default function MusterilerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Müşteriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreate = async (data: Parameters<typeof customerService.create>[0]) => {
    await customerService.create(data);
    setModalOpen(false);
    await fetchCustomers();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteriler"
        description="Müşteri kayıtlarını yönetin"
        action={<Button onClick={() => setModalOpen(true)}>Yeni Müşteri</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Listesi</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner className="mx-auto" />
            </div>
          ) : error ? (
            <div className="px-6 pb-6">
              <ErrorMessage message={error} />
            </div>
          ) : customers.length === 0 ? (
            <EmptyState message="Henüz müşteri kaydı bulunmuyor" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Adres</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.fullName}</TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                    <TableCell>{customer.address || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Müşteri" size="md">
        <CustomerForm onSubmit={handleCreate} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
