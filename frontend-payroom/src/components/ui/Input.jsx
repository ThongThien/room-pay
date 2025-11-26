import React, { forwardRef } from 'react'
const Input = forwardRef(({
  type = 'text',
  name,
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  rightIcon, 
  className = '', 
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type={type}
          id={id}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-2 border rounded-lg
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300'}
            ${rightIcon ? 'pr-10' : ''} 
            ${className}
          `}
          {...props}
        />
      
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightIcon}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'

export default Input