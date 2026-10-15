import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function usePhoneIndexStatus() {
  const [state, setState] = useState({ ready: false, loading: true, error: '' });

  useEffect(() => onSnapshot(
    doc(db, 'settings', 'phoneIndexStatus'),
    { includeMetadataChanges: true },
    snapshot => setState({
      ready: snapshot.data()?.ready === true && !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites,
      loading: snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites,
      error: '',
    }),
    () => setState({
      ready: false,
      loading: false,
      error: 'No se pudo verificar la disponibilidad del registro. Comprueba la conexión y vuelve a abrir esta pantalla.',
    }),
  ), []);

  return state;
}
