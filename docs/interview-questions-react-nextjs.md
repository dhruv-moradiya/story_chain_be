# React & Next.js Interview Questions

## Part 1: Practical Coding Tasks (React)

### 1. Custom Hook: useDebounce
**Task:** Create a custom hook that debounces a value.

```tsx
// Implement this hook
function useDebounce<T>(value: T, delay: number): T {
  // Your code here
}

// Usage
function SearchComponent() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    // This only runs 500ms after user stops typing
    fetchResults(debouncedSearch);
  }, [debouncedSearch]);

  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}
```

<details>
<summary>Solution</summary>

```tsx
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```
</details>

---

### 2. Custom Hook: useFetch
**Task:** Create a data fetching hook with loading, error, and refetch functionality.

```tsx
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  // Your code here
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, refetch } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} onRetry={refetch} />;
  return <Profile user={data} />;
}
```

<details>
<summary>Solution</summary>

```tsx
import { useState, useEffect, useCallback } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```
</details>

---

### 3. Custom Hook: useLocalStorage
**Task:** Create a hook that syncs state with localStorage.

```tsx
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Your code here
}

// Usage
function App() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  // theme persists across page reloads
}
```

<details>
<summary>Solution</summary>

```tsx
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage or use initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Sync to localStorage when value changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
```
</details>

---

### 4. Custom Hook: usePrevious
**Task:** Create a hook that returns the previous value of a variable.

```tsx
function usePrevious<T>(value: T): T | undefined {
  // Your code here
}

// Usage
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current: {count}, Previous: {prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
```

<details>
<summary>Solution</summary>

```tsx
import { useRef, useEffect } from 'react';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```
</details>

---

### 5. Optimized List Rendering
**Task:** Create a virtualized list component that only renders visible items.

```tsx
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  windowHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

function VirtualList<T>({ items, itemHeight, windowHeight, renderItem }: VirtualListProps<T>) {
  // Your code here
}

// Usage
<VirtualList
  items={thousandItems}
  itemHeight={50}
  windowHeight={500}
  renderItem={(item, idx) => <div key={idx}>{item.name}</div>}
/>
```

<details>
<summary>Solution</summary>

```tsx
import { useState, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  windowHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

function VirtualList<T>({
  items,
  itemHeight,
  windowHeight,
  renderItem,
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(windowHeight / itemHeight) + 2 * overscan;
    const end = Math.min(items.length - 1, start + visibleCount);

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end + 1)
    };
  }, [scrollTop, itemHeight, windowHeight, items, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      style={{ height: windowHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```
</details>

---

### 6. Form with Validation
**Task:** Create a reusable form hook with validation.

```tsx
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface UseFormOptions<T> {
  initialValues: T;
  validationRules: Record<keyof T, ValidationRule>;
  onSubmit: (values: T) => void | Promise<void>;
}

function useForm<T extends Record<string, string>>({
  initialValues,
  validationRules,
  onSubmit
}: UseFormOptions<T>) {
  // Your code here
}
```

<details>
<summary>Solution</summary>

```tsx
import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

interface UseFormOptions<T> {
  initialValues: T;
  validationRules: Partial<Record<keyof T, ValidationRule>>;
  onSubmit: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  setFieldValue: (field: keyof T, value: string) => void;
  reset: () => void;
}

function useForm<T extends Record<string, string>>({
  initialValues,
  validationRules,
  onSubmit
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof T, value: string): string | null => {
    const rules = validationRules[name];
    if (!rules) return null;

    if (rules.required && !value.trim()) {
      return 'This field is required';
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }

    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, [validationRules]);

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    (Object.keys(values) as Array<keyof T>).forEach(key => {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));

    // Clear error on change
    if (errors[name as keyof T]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleBlur = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name as keyof T, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof T, boolean>
    );
    setTouched(allTouched);

    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll, onSubmit]);

  const setFieldValue = useCallback((field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    reset
  };
}

// Usage Example
function LoginForm() {
  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit } = useForm({
    initialValues: { email: '', password: '' },
    validationRules: {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      password: {
        required: true,
        minLength: 8
      }
    },
    onSubmit: async (values) => {
      await login(values);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {touched.email && errors.email && <span>{errors.email}</span>}

      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {touched.password && errors.password && <span>{errors.password}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Login'}
      </button>
    </form>
  );
}
```
</details>

---

### 7. Modal Component with Portal
**Task:** Create a reusable modal component using React Portal.

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Your code here
}
```

<details>
<summary>Solution</summary>

```tsx
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnOverlayClick = true,
  closeOnEsc = true
}: ModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEsc]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {title && (
          <div className="modal-header" style={{ marginBottom: '16px' }}>
            <h2 id="modal-title" style={{ margin: 0 }}>{title}</h2>
          </div>
        )}

        <div className="modal-body">{children}</div>

        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          &times;
        </button>
      </div>
    </div>,
    document.body
  );
}

// Custom hook for modal state
function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}

// Usage
function App() {
  const { isOpen, open, close } = useModal();

  return (
    <>
      <button onClick={open}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={close} title="Welcome">
        <p>This is the modal content!</p>
        <button onClick={close}>Close</button>
      </Modal>
    </>
  );
}
```
</details>

---

### 8. Compound Component Pattern
**Task:** Create a Tab component using the compound component pattern.

```tsx
// Should be used like this:
<Tabs defaultTab="tab1">
  <Tabs.List>
    <Tabs.Tab id="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab id="tab2">Tab 2</Tabs.Tab>
    <Tabs.Tab id="tab3">Tab 3</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel id="tab1">Content 1</Tabs.Panel>
    <Tabs.Panel id="tab2">Content 2</Tabs.Panel>
    <Tabs.Panel id="tab3">Content 3</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
```

<details>
<summary>Solution</summary>

```tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Context
interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within Tabs');
  }
  return context;
}

// Main Tabs component
interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onChange?: (tabId: string) => void;
}

function Tabs({ defaultTab, children, onChange }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultTab);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabState(id);
    onChange?.(id);
  }, [onChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List
function TabList({ children }: { children: ReactNode }) {
  return (
    <div className="tabs-list" role="tablist">
      {children}
    </div>
  );
}

// Individual Tab
interface TabProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderBottom: isActive ? '2px solid blue' : '2px solid transparent',
        background: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      {children}
    </button>
  );
}

// Panels Container
function Panels({ children }: { children: ReactNode }) {
  return <div className="tabs-panels">{children}</div>;
}

// Individual Panel
interface PanelProps {
  id: string;
  children: ReactNode;
}

function Panel({ id, children }: PanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={id}
      style={{ padding: '16px' }}
    >
      {children}
    </div>
  );
}

// Attach compound components
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panels = Panels;
Tabs.Panel = Panel;

export default Tabs;

// Usage
function App() {
  return (
    <Tabs defaultTab="profile" onChange={(id) => console.log('Tab changed:', id)}>
      <Tabs.List>
        <Tabs.Tab id="profile">Profile</Tabs.Tab>
        <Tabs.Tab id="settings">Settings</Tabs.Tab>
        <Tabs.Tab id="notifications" disabled>Notifications</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panels>
        <Tabs.Panel id="profile">
          <h2>Profile Content</h2>
          <p>User profile information here...</p>
        </Tabs.Panel>
        <Tabs.Panel id="settings">
          <h2>Settings Content</h2>
          <p>Application settings here...</p>
        </Tabs.Panel>
        <Tabs.Panel id="notifications">
          <h2>Notifications Content</h2>
        </Tabs.Panel>
      </Tabs.Panels>
    </Tabs>
  );
}
```
</details>

---

### 9. Infinite Scroll Component
**Task:** Create an infinite scroll component that loads more items when reaching the bottom.

```tsx
interface InfiniteScrollProps<T> {
  loadMore: () => Promise<T[]>;
  hasMore: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  loader?: React.ReactNode;
}

function InfiniteScroll<T>({ loadMore, hasMore, renderItem, loader }: InfiniteScrollProps<T>) {
  // Your code here
}
```

<details>
<summary>Solution</summary>

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollProps<T> {
  loadMore: () => Promise<T[]>;
  hasMore: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  loader?: React.ReactNode;
  threshold?: number;
}

function InfiniteScroll<T>({
  loadMore,
  hasMore,
  renderItem,
  loader = <div>Loading...</div>,
  threshold = 100
}: InfiniteScrollProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newItems = await loadMore();
      setItems(prev => [...prev, ...newItems]);
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, loadMore]);

  // Using Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          handleLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loading, handleLoadMore, threshold]);

  // Initial load
  useEffect(() => {
    if (items.length === 0) {
      handleLoadMore();
    }
  }, []);

  return (
    <div ref={containerRef} className="infinite-scroll-container">
      {items.map((item, index) => (
        <div key={index} className="infinite-scroll-item">
          {renderItem(item, index)}
        </div>
      ))}

      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} style={{ height: '1px' }} />

      {loading && loader}

      {!hasMore && items.length > 0 && (
        <div className="end-message">No more items to load</div>
      )}
    </div>
  );
}

// Usage Example
interface Post {
  id: number;
  title: string;
  body: string;
}

function PostList() {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async (): Promise<Post[]> => {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts?_page=${page}&_limit=10`
    );
    const data = await response.json();

    if (data.length < 10) {
      setHasMore(false);
    }

    setPage(prev => prev + 1);
    return data;
  };

  return (
    <InfiniteScroll<Post>
      loadMore={loadMore}
      hasMore={hasMore}
      renderItem={(post) => (
        <div className="post-card">
          <h3>{post.title}</h3>
          <p>{post.body}</p>
        </div>
      )}
      loader={<div className="spinner">Loading posts...</div>}
    />
  );
}
```
</details>

---

### 10. Context with Reducer Pattern
**Task:** Implement a shopping cart using Context + Reducer pattern.

```tsx
// Create CartContext with the following functionality:
// - Add item
// - Remove item
// - Update quantity
// - Clear cart
// - Get total price
```

<details>
<summary>Solution</summary>

```tsx
import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';

// Types
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (id: string) => number;
}

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        item => item.id === action.payload.id
      );

      if (existingIndex > -1) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1
        };
        return { ...state, items: newItems };
      }

      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== action.payload.id)
        };
      }

      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    default:
      return state;
  }
}

// Context
const CartContext = createContext<CartContextType | null>(null);

// Provider
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const totalItems = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  );

  const totalPrice = useMemo(
    () => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [state.items]
  );

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemQuantity = (id: string) => {
    return state.items.find(item => item.id === id)?.quantity ?? 0;
  };

  const value: CartContextType = {
    items: state.items,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Hook
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

// Usage
function ProductCard({ product }: { product: { id: string; name: string; price: number } }) {
  const { addItem, getItemQuantity, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p>${product.price}</p>

      {quantity === 0 ? (
        <button onClick={() => addItem(product)}>Add to Cart</button>
      ) : (
        <div className="quantity-controls">
          <button onClick={() => updateQuantity(product.id, quantity - 1)}>-</button>
          <span>{quantity}</span>
          <button onClick={() => updateQuantity(product.id, quantity + 1)}>+</button>
        </div>
      )}
    </div>
  );
}

function CartSummary() {
  const { items, totalItems, totalPrice, clearCart } = useCart();

  return (
    <div className="cart-summary">
      <h2>Cart ({totalItems} items)</h2>
      {items.map(item => (
        <div key={item.id}>
          {item.name} x {item.quantity} = ${item.price * item.quantity}
        </div>
      ))}
      <div className="total">Total: ${totalPrice.toFixed(2)}</div>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}
```
</details>

---

## Part 2: Practical Coding Tasks (Next.js)

### 11. API Route with Middleware
**Task:** Create an API route with authentication middleware in Next.js App Router.

```typescript
// Create:
// 1. A middleware that checks for auth token
// 2. A protected API route that uses this middleware
```

<details>
<summary>Solution</summary>

```typescript
// middleware.ts (in root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for auth token in cookies or headers
  const token = request.cookies.get('auth-token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  // Protect /api/protected routes
  if (request.nextUrl.pathname.startsWith('/api/protected')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token (simplified - use proper JWT verification)
    try {
      // In real app: verify JWT and decode user info
      const isValid = token.length > 10; // Placeholder validation

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Add user info to headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', 'decoded-user-id');

      return NextResponse.next({
        request: { headers: requestHeaders }
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Token verification failed' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/protected/:path*'
};

// app/api/protected/user/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // User ID was added by middleware
  const userId = request.headers.get('x-user-id');

  // Fetch user data
  const user = await getUserById(userId);

  return NextResponse.json({ user });
}

// Alternative: Using higher-order function for route protection
// lib/withAuth.ts
import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (
  request: NextRequest,
  context: { params: Record<string, string>; userId: string }
) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (request: NextRequest, context: { params: Record<string, string> }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = verifyToken(token); // Your verification logic
      return handler(request, { ...context, userId: decoded.userId });
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}

// app/api/protected/posts/route.ts
import { withAuth } from '@/lib/withAuth';

export const GET = withAuth(async (request, { userId }) => {
  const posts = await getPostsByUser(userId);
  return NextResponse.json({ posts });
});
```
</details>

---

### 12. Server Component with Data Fetching
**Task:** Create a server component that fetches and displays data with proper error handling.

```tsx
// Create a blog post page with:
// - Server-side data fetching
// - Loading state (Suspense)
// - Error boundary
// - SEO metadata
```

<details>
<summary>Solution</summary>

```tsx
// app/blog/[slug]/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

// Types
interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  excerpt: string;
}

// Data fetching function
async function getPost(slug: string): Promise<Post | null> {
  try {
    const response = await fetch(`${process.env.API_URL}/posts/${slug}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch post');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
}

// Generate metadata
export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author]
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt
    }
  };
}

// Static params for SSG
export async function generateStaticParams() {
  const posts = await fetch(`${process.env.API_URL}/posts`).then(r => r.json());

  return posts.map((post: Post) => ({
    slug: post.slug
  }));
}

// Post content component (can be a separate server component)
async function PostContent({ slug }: { slug: string }) {
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="post">
      <header>
        <h1>{post.title}</h1>
        <div className="meta">
          <span>By {post.author}</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString()}
          </time>
        </div>
      </header>
      <div
        className="content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}

// Loading component
function PostSkeleton() {
  return (
    <article className="post skeleton">
      <header>
        <div className="skeleton-title" />
        <div className="skeleton-meta" />
      </header>
      <div className="skeleton-content">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    </article>
  );
}

// Main page component
export default function BlogPostPage({
  params
}: {
  params: { slug: string };
}) {
  return (
    <main className="blog-post-page">
      <Suspense fallback={<PostSkeleton />}>
        <PostContent slug={params.slug} />
      </Suspense>
    </main>
  );
}

// app/blog/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Post Not Found</h1>
      <p>The blog post you're looking for doesn't exist.</p>
      <a href="/blog">Back to Blog</a>
    </div>
  );
}

// app/blog/[slug]/error.tsx
'use client';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// app/blog/[slug]/loading.tsx (alternative to Suspense)
export default function Loading() {
  return <PostSkeleton />;
}
```
</details>

---

### 13. Server Actions
**Task:** Create a form that uses Server Actions for submission.

```tsx
// Create a contact form with:
// - Server Action for form submission
// - Form validation
// - Loading state
// - Success/error feedback
```

<details>
<summary>Solution</summary>

```tsx
// app/contact/page.tsx
import { ContactForm } from './contact-form';

export default function ContactPage() {
  return (
    <main className="contact-page">
      <h1>Contact Us</h1>
      <ContactForm />
    </main>
  );
}

// app/contact/actions.ts
'use server';

import { z } from 'zod';

// Validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters')
});

export type ContactFormState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    message?: string[];
  };
};

export async function submitContactForm(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Parse form data
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message')
  };

  // Validate
  const validationResult = contactSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validationResult.error.flatten().fieldErrors
    };
  }

  // Process the form (send email, save to DB, etc.)
  try {
    await sendContactEmail(validationResult.data);

    return {
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to send message. Please try again.'
    };
  }
}

async function sendContactEmail(data: z.infer<typeof contactSchema>) {
  // Implement email sending logic
  console.log('Sending email:', data);
}

// app/contact/contact-form.tsx
'use client';

import { useActionState } from 'react';
import { submitContactForm, ContactFormState } from './actions';

const initialState: ContactFormState = {
  success: false,
  message: ''
};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    initialState
  );

  return (
    <form action={formAction} className="contact-form">
      {state.message && (
        <div className={`alert ${state.success ? 'alert-success' : 'alert-error'}`}>
          {state.message}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          disabled={isPending}
          aria-describedby={state.errors?.name ? 'name-error' : undefined}
        />
        {state.errors?.name && (
          <span id="name-error" className="error">
            {state.errors.name[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          disabled={isPending}
          aria-describedby={state.errors?.email ? 'email-error' : undefined}
        />
        {state.errors?.email && (
          <span id="email-error" className="error">
            {state.errors.email[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          disabled={isPending}
          aria-describedby={state.errors?.message ? 'message-error' : undefined}
        />
        {state.errors?.message && (
          <span id="message-error" className="error">
            {state.errors.message[0]}
          </span>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

// Alternative: Using useTransition for more control
'use client';

import { useTransition, useState } from 'react';
import { submitContactForm } from './actions';

export function ContactFormWithTransition() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ContactFormState>(initialState);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitContactForm(state, formData);
      setState(result);
    });
  }

  return (
    <form action={handleSubmit}>
      {/* Same form fields... */}
    </form>
  );
}
```
</details>

---

## Part 3: Theory Questions

### React Core Concepts

#### 1. Virtual DOM
**Q: Explain how React's Virtual DOM works and why it's beneficial.**

<details>
<summary>Answer</summary>

The **Virtual DOM (VDOM)** is a lightweight JavaScript representation of the actual DOM.

**How it works:**
1. When state changes, React creates a new Virtual DOM tree
2. React compares (diffs) the new VDOM with the previous one
3. It calculates the minimum set of changes needed
4. Only those changes are applied to the real DOM (reconciliation)

**Reconciliation Algorithm:**
```jsx
// React compares elements by type
<div>Hello</div>  // Before
<span>Hello</span> // After
// Different types → unmount old, mount new

// Same type → update attributes
<div className="old" />
<div className="new" />
// Only className attribute is updated
```

**Key (Keyed) Reconciliation:**
```jsx
// Without keys - inefficient
<ul>
  <li>A</li>
  <li>B</li>
</ul>
// Add to beginning → re-renders all items

// With keys - efficient
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
</ul>
// Add to beginning → only inserts new item
```

**Benefits:**
1. **Batched updates**: Multiple state changes result in one DOM update
2. **Efficient diffing**: O(n) algorithm instead of O(n³)
3. **Cross-platform**: Same reconciliation for web, native, etc.
4. **Declarative**: Describe what UI should look like, not how to update it

**Fiber Architecture (React 16+):**
- Work is split into units (fibers)
- Can pause, resume, or abort rendering
- Enables concurrent features (Suspense, transitions)
- Prioritizes urgent updates (user input) over less urgent ones
</details>

---

#### 2. React Hooks Rules
**Q: What are the Rules of Hooks? Why do they exist?**

<details>
<summary>Answer</summary>

**Rules of Hooks:**

1. **Only call hooks at the top level**
   - Don't call hooks inside loops, conditions, or nested functions
   - Must be called in the same order every render

2. **Only call hooks from React functions**
   - Call from function components or custom hooks
   - Not from regular JavaScript functions

**Why these rules exist:**

React tracks hooks by their **call order** in a linked list:

```jsx
// This works because order is consistent
function Component() {
  const [name, setName] = useState('');  // Hook #1
  const [age, setAge] = useState(0);     // Hook #2
  useEffect(() => {}, []);               // Hook #3
}

// This breaks because order changes
function BrokenComponent({ showName }) {
  if (showName) {
    const [name, setName] = useState(''); // Conditionally called!
  }
  const [age, setAge] = useState(0);
  // On second render without showName, age gets name's state!
}
```

**Internally:**
```jsx
// React maintains something like:
{
  memoizedState: [
    { state: '' },      // useState #1
    { state: 0 },       // useState #2
    { effect: fn }      // useEffect #3
  ],
  currentIndex: 0
}
```

**Correct patterns:**
```jsx
// Put condition inside the hook
function Component({ userId }) {
  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
  }, [userId]);
}

// Early return is OK (but hooks come first)
function Component({ isLoading }) {
  const [data, setData] = useState(null);

  if (isLoading) return <Spinner />;

  return <div>{data}</div>;
}
```

**ESLint plugin**: `eslint-plugin-react-hooks` enforces these rules automatically.
</details>

---

#### 3. useEffect vs useLayoutEffect
**Q: What's the difference between useEffect and useLayoutEffect? When would you use each?**

<details>
<summary>Answer</summary>

**Timing:**

```
Render → DOM Update → useLayoutEffect → Paint → useEffect
```

**useEffect:**
- Runs **after** the browser paints
- Asynchronous (doesn't block rendering)
- For most side effects: data fetching, subscriptions, logging

```jsx
function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  return <div>{data}</div>;
}
```

**useLayoutEffect:**
- Runs **before** the browser paints
- Synchronous (blocks rendering)
- For DOM measurements and synchronous visual updates

```jsx
function Tooltip({ targetRef }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    // Measure DOM before paint to prevent flicker
    const rect = targetRef.current.getBoundingClientRect();
    setPosition({ x: rect.left, y: rect.bottom });
  }, [targetRef]);

  return <div style={{ left: position.x, top: position.y }}>Tooltip</div>;
}
```

**Use Cases:**

| useEffect | useLayoutEffect |
|-----------|-----------------|
| Data fetching | DOM measurements |
| Subscriptions | Scroll position sync |
| Logging/analytics | Animation setup |
| Non-visual updates | Tooltip positioning |

**Example - Preventing Flash:**
```jsx
// Bad: Flash of unstyled content
function BadAutoFocus() {
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current.focus(); // User sees unfocused briefly
  }, []);

  return <input ref={inputRef} />;
}

// Good: No flash
function GoodAutoFocus() {
  const inputRef = useRef();

  useLayoutEffect(() => {
    inputRef.current.focus(); // Focused before paint
  }, []);

  return <input ref={inputRef} />;
}
```

**SSR Note:**
`useLayoutEffect` shows a warning in SSR because there's no DOM. Use `useEffect` or check for client-side:

```jsx
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
```
</details>

---

#### 4. React.memo, useMemo, useCallback
**Q: Explain the differences between React.memo, useMemo, and useCallback. When should each be used?**

<details>
<summary>Answer</summary>

**React.memo** - Memoizes a component
```jsx
// Re-renders only if props change (shallow comparison)
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  return <div>{/* expensive rendering */}</div>;
});

// With custom comparison
const Component = React.memo(
  function Component({ user }) {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.user.id === nextProps.user.id;
  }
);
```

**useMemo** - Memoizes a computed value
```jsx
function Component({ items, filter }) {
  // Only recalculates when items or filter change
  const filteredItems = useMemo(() => {
    return items.filter(item => item.includes(filter));
  }, [items, filter]);

  return <List items={filteredItems} />;
}
```

**useCallback** - Memoizes a function reference
```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // Without useCallback: new function every render
  // const handleClick = () => setCount(c => c + 1);

  // With useCallback: same function reference
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <MemoizedChild onClick={handleClick} />;
}
```

**When to use each:**

| Tool | Use When |
|------|----------|
| React.memo | Component re-renders often with same props |
| useMemo | Expensive calculation that doesn't need to run every render |
| useCallback | Passing callbacks to memoized children |

**Common Mistakes:**

```jsx
// Mistake 1: Using useMemo for cheap operations
const doubled = useMemo(() => count * 2, [count]); // Overkill!
const doubled = count * 2; // Just do this

// Mistake 2: Missing dependency breaks memoization
const handleClick = useCallback(() => {
  console.log(count); // count not in deps = stale closure!
}, []); // Should be [count]

// Mistake 3: Memoizing everything
// Only memoize when you've identified a performance issue
```

**Relationship:**
```jsx
// useCallback is shorthand for useMemo with functions
useCallback(fn, deps)
// is equivalent to
useMemo(() => fn, deps)
```

**Best Practice:**
1. Profile first - don't prematurely optimize
2. Use React DevTools Profiler to identify slow renders
3. Memoize expensive computations
4. Memoize callbacks passed to memoized children
</details>

---

#### 5. Controlled vs Uncontrolled Components
**Q: Explain controlled vs uncontrolled components. When would you use each?**

<details>
<summary>Answer</summary>

**Controlled Components:**
React state is the "single source of truth"

```jsx
function ControlledInput() {
  const [value, setValue] = useState('');

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

**Uncontrolled Components:**
DOM is the source of truth, use refs to access values

```jsx
function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    console.log(inputRef.current?.value);
  };

  return <input ref={inputRef} defaultValue="initial" />;
}
```

**Comparison:**

| Aspect | Controlled | Uncontrolled |
|--------|------------|--------------|
| Source of truth | React state | DOM |
| Value access | Via state | Via ref |
| Initial value | `value` prop | `defaultValue` |
| Validation | On every change | On submit |
| Re-renders | On every keystroke | None |

**When to use Controlled:**
- Form validation on change
- Conditional disable submit
- Enforcing input format
- Multiple inputs depending on each other
- Dynamic form fields

```jsx
// Format as user types
function PhoneInput() {
  const [value, setValue] = useState('');

  const handleChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue(formatted);
  };

  return <input value={value} onChange={handleChange} />;
}
```

**When to use Uncontrolled:**
- Simple forms without validation
- File inputs (always uncontrolled)
- Integration with non-React code
- Performance-critical forms with many fields

```jsx
// File input is always uncontrolled
function FileUpload() {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const file = fileRef.current?.files?.[0];
    uploadFile(file);
  };

  return <input type="file" ref={fileRef} />;
}
```

**Hybrid Approach with react-hook-form:**
```jsx
import { useForm } from 'react-hook-form';

function HybridForm() {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('name')} />
      <button type="submit">Submit</button>
    </form>
  );
}
```
</details>

---

#### 6. Error Boundaries
**Q: What are Error Boundaries? How do you implement one?**

<details>
<summary>Answer</summary>

**Error Boundaries** catch JavaScript errors in child component tree, log them, and display fallback UI.

**Important:** They only catch errors in:
- Rendering
- Lifecycle methods
- Constructors of child components

**They DON'T catch:**
- Event handlers
- Async code (setTimeout, promises)
- Server-side rendering
- Errors in the boundary itself

**Implementation:**
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    logErrorToService(error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorPage />}>
  <MyComponent />
</ErrorBoundary>
```

**With Reset Functionality:**
```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Error occurred</h1>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Using react-error-boundary library:**
```jsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => logError(error, info)}
      onReset={() => {
        // Reset app state
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**Handling Event Handler Errors:**
```jsx
function Component() {
  const [error, setError] = useState(null);

  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (e) {
      setError(e);
      // Or throw to let error boundary catch it:
      // throw e; // Won't work in event handler!
    }
  };

  if (error) throw error; // This WILL be caught by boundary

  return <button onClick={handleClick}>Click</button>;
}
```
</details>

---

#### 7. React Context Performance
**Q: What are the performance implications of React Context? How do you optimize it?**

<details>
<summary>Answer</summary>

**The Problem:**
When context value changes, ALL consumers re-render, even if they only use part of the value.

```jsx
// Bad: All consumers re-render when ANY value changes
const AppContext = createContext();

function Provider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);

  return (
    <AppContext.Provider value={{ user, theme, notifications, setUser, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

// ThemeButton re-renders when user or notifications change!
function ThemeButton() {
  const { theme, setTheme } = useContext(AppContext);
  return <button onClick={() => setTheme('dark')}>{theme}</button>;
}
```

**Optimization Strategies:**

**1. Split Contexts:**
```jsx
const UserContext = createContext();
const ThemeContext = createContext();

function Providers({ children }) {
  return (
    <UserProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </UserProvider>
  );
}

// Now ThemeButton only re-renders when theme changes
function ThemeButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button>{theme}</button>;
}
```

**2. Separate State from Dispatch:**
```jsx
const StateContext = createContext();
const DispatchContext = createContext();

function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        {children}
      </StateContext.Provider>
    </DispatchContext.Provider>
  );
}

// Components that only dispatch don't re-render on state change
function AddButton() {
  const dispatch = useContext(DispatchContext);
  return <button onClick={() => dispatch({ type: 'ADD' })}>Add</button>;
}
```

**3. Memoize Context Value:**
```jsx
function Provider({ children }) {
  const [user, setUser] = useState(null);

  // Without useMemo: new object every render → all consumers re-render
  // const value = { user, setUser };

  // With useMemo: same object reference if user hasn't changed
  const value = useMemo(() => ({ user, setUser }), [user]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

**4. Use Selectors (like Redux):**
```jsx
import { useContextSelector } from 'use-context-selector';

const Context = createContext();

function ThemeDisplay() {
  // Only re-renders when theme changes
  const theme = useContextSelector(Context, (state) => state.theme);
  return <div>{theme}</div>;
}
```

**5. Component Composition:**
```jsx
// Instead of consuming context deep in the tree
function App() {
  return (
    <UserProvider>
      <Layout>
        <Sidebar>
          <UserProfile /> {/* Consumes context */}
        </Sidebar>
      </Layout>
    </UserProvider>
  );
}

// Lift context consumption up
function App() {
  const user = useUser();
  return (
    <Layout>
      <Sidebar>
        <UserProfile user={user} /> {/* Props, not context */}
      </Sidebar>
    </Layout>
  );
}
```
</details>

---

### Next.js Concepts

#### 8. Server Components vs Client Components
**Q: Explain Server Components and Client Components in Next.js 13+. When should you use each?**

<details>
<summary>Answer</summary>

**Server Components (default in App Router):**
- Rendered on the server
- Can access backend resources directly
- No JavaScript sent to client for the component itself
- Cannot use hooks or browser APIs

```tsx
// app/page.tsx - Server Component by default
async function Page() {
  // Direct database access
  const users = await db.users.findMany();

  // Direct file system access
  const data = await fs.readFile('./data.json');

  return <UserList users={users} />;
}
```

**Client Components:**
- Rendered on client (also pre-rendered on server)
- Can use hooks, state, effects
- Can use browser APIs
- Add `'use client'` directive

```tsx
'use client';

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

**When to use each:**

| Server Components | Client Components |
|-------------------|-------------------|
| Data fetching | Interactivity (onClick, onChange) |
| Backend access | useState, useEffect |
| Sensitive data/API keys | Browser APIs |
| Large dependencies | Event listeners |
| Static content | Client-side state |

**Patterns:**

**1. Server Component with Client Child:**
```tsx
// page.tsx (Server)
import { ClientButton } from './client-button';

async function Page() {
  const data = await fetchData();
  return (
    <div>
      <h1>{data.title}</h1>
      <ClientButton /> {/* Interactive part */}
    </div>
  );
}
```

**2. Passing Server Data to Client:**
```tsx
// page.tsx (Server)
async function Page() {
  const initialData = await fetchData();
  return <ClientComponent initialData={initialData} />;
}

// client-component.tsx
'use client';
function ClientComponent({ initialData }) {
  const [data, setData] = useState(initialData);
  // Can now update data client-side
}
```

**3. Composition Pattern:**
```tsx
// layout.tsx (Server)
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Sidebar /> {/* Server Component */}
        {children}
      </body>
    </html>
  );
}

// sidebar.tsx (Server) - can have client children
import { NavLinks } from './nav-links';

async function Sidebar() {
  const links = await getNavLinks();
  return (
    <nav>
      <NavLinks links={links} /> {/* Client for hover effects */}
    </nav>
  );
}
```

**Cannot:**
- Import Server Component into Client Component
- Pass functions as props from Server to Client

```tsx
// This won't work
'use client';
import { ServerComponent } from './server'; // Error!

// This won't work either
<ClientComponent onSubmit={serverAction} /> // Functions can't serialize
```
</details>

---

#### 9. Next.js Data Fetching
**Q: Explain the different data fetching strategies in Next.js 13+ App Router.**

<details>
<summary>Answer</summary>

**1. Server Component Fetching (Recommended):**
```tsx
// Automatic deduplication - same URL fetched once
async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data}</div>;
}
```

**2. Caching Strategies:**
```tsx
// Static (default) - cached indefinitely
fetch('https://api.example.com/data');
// Or explicitly:
fetch('https://api.example.com/data', { cache: 'force-cache' });

// Dynamic - no caching
fetch('https://api.example.com/data', { cache: 'no-store' });

// Revalidate - cached for N seconds
fetch('https://api.example.com/data', { next: { revalidate: 60 } });

// Tag-based revalidation
fetch('https://api.example.com/data', { next: { tags: ['posts'] } });
// Later: revalidateTag('posts')
```

**3. Route Segment Config:**
```tsx
// Force dynamic rendering for entire route
export const dynamic = 'force-dynamic';

// Or force static
export const dynamic = 'force-static';

// Revalidate entire route
export const revalidate = 60;
```

**4. generateStaticParams (SSG):**
```tsx
// app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map(post => ({ slug: post.slug }));
}

// These pages are generated at build time
export default async function PostPage({ params }) {
  const post = await getPost(params.slug);
  return <Article post={post} />;
}
```

**5. Parallel Data Fetching:**
```tsx
async function Page() {
  // Sequential (slow)
  const user = await getUser();
  const posts = await getPosts();

  // Parallel (fast)
  const [user, posts] = await Promise.all([
    getUser(),
    getPosts()
  ]);

  return <div>...</div>;
}
```

**6. Streaming with Suspense:**
```tsx
import { Suspense } from 'react';

async function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}

// SlowComponent fetches its own data
async function SlowComponent() {
  const data = await slowFetch(); // Takes 3 seconds
  return <div>{data}</div>;
}
```

**7. Server Actions for Mutations:**
```tsx
// actions.ts
'use server';

export async function createPost(formData: FormData) {
  await db.posts.create({ data: { title: formData.get('title') } });
  revalidatePath('/posts');
}

// page.tsx
import { createPost } from './actions';

function Page() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  );
}
```
</details>

---

#### 10. Next.js Routing
**Q: Explain the App Router file conventions and routing patterns.**

<details>
<summary>Answer</summary>

**File Conventions:**

```
app/
├── layout.tsx      # Shared layout (wraps children)
├── page.tsx        # Unique route UI
├── loading.tsx     # Loading UI (Suspense boundary)
├── error.tsx       # Error UI (Error boundary)
├── not-found.tsx   # 404 UI
├── route.ts        # API endpoint
└── template.tsx    # Re-mounted layout
```

**Route Segments:**
```
app/
├── page.tsx                    # /
├── about/page.tsx              # /about
├── blog/
│   ├── page.tsx                # /blog
│   └── [slug]/page.tsx         # /blog/:slug
├── shop/
│   └── [...slug]/page.tsx      # /shop/* (catch-all)
└── docs/
    └── [[...slug]]/page.tsx    # /docs or /docs/* (optional catch-all)
```

**Dynamic Segments:**
```tsx
// app/users/[id]/page.tsx
export default function UserPage({ params }: { params: { id: string } }) {
  return <div>User: {params.id}</div>;
}

// app/posts/[...slug]/page.tsx (catch-all)
// /posts/2024/01/hello → params.slug = ['2024', '01', 'hello']
```

**Route Groups (Organization):**
```
app/
├── (marketing)/
│   ├── about/page.tsx          # /about
│   └── contact/page.tsx        # /contact
├── (shop)/
│   ├── products/page.tsx       # /products
│   └── cart/page.tsx           # /cart
└── (auth)/
    ├── layout.tsx              # Shared auth layout
    ├── login/page.tsx          # /login
    └── register/page.tsx       # /register
```

**Parallel Routes:**
```
app/
├── @modal/
│   └── login/page.tsx
├── @sidebar/
│   └── default.tsx
├── layout.tsx
└── page.tsx

// layout.tsx
export default function Layout({ children, modal, sidebar }) {
  return (
    <>
      {sidebar}
      {children}
      {modal}
    </>
  );
}
```

**Intercepting Routes:**
```
app/
├── feed/
│   └── page.tsx
├── photo/
│   └── [id]/page.tsx           # /photo/123 (full page)
└── @modal/
    └── (.)photo/
        └── [id]/page.tsx       # Intercepts /photo/123 as modal

// (.) - same level
// (..) - one level up
// (..)(..) - two levels up
// (...) - from root
```

**Private Folders:**
```
app/
├── _components/           # Not a route, private folder
│   └── Button.tsx
└── page.tsx
```

**API Routes:**
```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await createUser(body);
  return NextResponse.json(user, { status: 201 });
}

// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser(params.id);
  return NextResponse.json(user);
}
```
</details>

---

#### 11. Next.js Middleware
**Q: Explain Next.js Middleware. What can and can't you do with it?**

<details>
<summary>Answer</summary>

**Middleware** runs before a request is completed, allowing you to modify the response.

**Basic Usage:**
```tsx
// middleware.ts (in project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check auth
  const token = request.cookies.get('token');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Configure which paths middleware runs on
export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
};
```

**What you CAN do:**

**1. Redirects:**
```tsx
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/old-page') {
    return NextResponse.redirect(new URL('/new-page', request.url));
  }
}
```

**2. Rewrites:**
```tsx
export function middleware(request: NextRequest) {
  // A/B testing
  if (Math.random() < 0.5) {
    return NextResponse.rewrite(new URL('/variant-a', request.url));
  }
  return NextResponse.rewrite(new URL('/variant-b', request.url));
}
```

**3. Set Headers:**
```tsx
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'value');
  return response;
}
```

**4. Read/Set Cookies:**
```tsx
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Read cookie
  const theme = request.cookies.get('theme');

  // Set cookie
  response.cookies.set('visited', 'true', { maxAge: 60 * 60 });

  return response;
}
```

**5. Geo-location / IP-based routing:**
```tsx
export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US';

  if (country === 'GB') {
    return NextResponse.rewrite(new URL('/uk', request.url));
  }
}
```

**What you CAN'T do:**

- Access database directly
- Use Node.js APIs (fs, path, etc.)
- Import large dependencies (runs at Edge)
- Modify response body
- Call Server Actions

**Matcher Patterns:**
```tsx
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',

    // Match specific paths
    '/dashboard/:path*',

    // Match API routes
    '/api/:path*',
  ]
};
```

**Common Use Cases:**
- Authentication/Authorization
- Redirects based on locale/geo
- A/B testing
- Bot protection
- Feature flags
- Rate limiting (with Edge-compatible stores)
</details>

---

#### 12. Static vs Dynamic Rendering
**Q: Explain static and dynamic rendering in Next.js. How does Next.js decide which to use?**

<details>
<summary>Answer</summary>

**Static Rendering (Default):**
- Pages rendered at build time
- HTML cached and reused for every request
- Fastest possible response time

```tsx
// This is static by default
async function Page() {
  const posts = await fetch('https://api.example.com/posts');
  return <PostList posts={posts} />;
}
```

**Dynamic Rendering:**
- Pages rendered at request time
- Fresh data on every request
- Required when data depends on request

```tsx
// This becomes dynamic
async function Page() {
  // Dynamic functions trigger dynamic rendering
  const { searchParams } = useSearchParams();
  const data = await fetch(`/api/data?q=${searchParams.q}`);
  return <Results data={data} />;
}
```

**What triggers Dynamic Rendering:**

1. **Dynamic Functions:**
```tsx
import { cookies, headers } from 'next/headers';

async function Page() {
  const cookieStore = cookies();      // Dynamic
  const headersList = headers();       // Dynamic
  const { searchParams } = useSearchParams(); // Dynamic
}
```

2. **Uncached Fetch:**
```tsx
fetch(url, { cache: 'no-store' });     // Dynamic
fetch(url, { next: { revalidate: 0 }}); // Dynamic
```

3. **Route Segment Config:**
```tsx
export const dynamic = 'force-dynamic';
```

**Rendering Decision Flow:**
```
Is there a dynamic function? → Yes → Dynamic
                            → No  → Is fetch uncached? → Yes → Dynamic
                                                       → No  → Static
```

**Partial Pre-rendering (PPR) - Experimental:**
```tsx
// Part of page is static, part is dynamic
async function Page() {
  return (
    <div>
      <StaticHeader />
      <Suspense fallback={<Skeleton />}>
        <DynamicContent /> {/* Streams in after */}
      </Suspense>
    </div>
  );
}
```

**Checking Render Mode:**
Build output shows:
- `○` (Static) - prerendered as static
- `λ` (Dynamic) - server-rendered on demand
- `●` (SSG) - statically generated with data

**Best Practices:**
```tsx
// Prefer static when possible
export const revalidate = 3600; // Revalidate every hour

// Use dynamic only when needed
export const dynamic = 'force-dynamic';

// Consider ISR for best of both worlds
export async function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }));
}
```
</details>

---

## Quick Reference: Common Mistakes

### React

```jsx
// 1. Mutating state directly
const [items, setItems] = useState([]);
items.push(newItem); // Wrong!
setItems([...items, newItem]); // Correct

// 2. Missing key in lists
{items.map(item => <Item item={item} />)} // Warning!
{items.map(item => <Item key={item.id} item={item} />)} // Correct

// 3. Using index as key for dynamic lists
{items.map((item, i) => <Item key={i} />)} // Bad for reordering
{items.map(item => <Item key={item.id} />)} // Good

// 4. Stale closure in useEffect
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1); // Uses stale count!
  }, 1000);
}, []);

// Fix:
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1); // Uses updater function
  }, 1000);
  return () => clearInterval(interval);
}, []);

// 5. Missing cleanup
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup = memory leak!
}, []);

// Fix:
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// 6. Unnecessary useEffect
useEffect(() => {
  setFullName(firstName + ' ' + lastName);
}, [firstName, lastName]);

// Fix - derived state:
const fullName = firstName + ' ' + lastName;
```

### Next.js

```tsx
// 1. Using hooks in Server Components
// app/page.tsx
import { useState } from 'react'; // Error!

// Fix: Add 'use client' or move to client component

// 2. Forgetting to await in Server Components
async function Page() {
  const data = fetch('/api/data'); // Missing await!
  return <div>{data}</div>; // Won't work
}

// 3. Importing Server Component in Client
'use client';
import ServerComponent from './server'; // Won't work!

// Fix: Pass as children
<ClientWrapper>
  <ServerComponent />
</ClientWrapper>

// 4. Not handling loading states
// Missing loading.tsx or Suspense = blank screen during fetch

// 5. Redundant 'use client'
'use client';
import { ClientComponent } from './client';
// If parent is client, children are too - no need for directive
```
