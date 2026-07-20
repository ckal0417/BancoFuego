export const openApiConfig = {
    openapi: "3.0.3",

    info: {
        title: "BancoFuego API",
        version: "2.0.0",
        description:
            "API bancaria para autenticación, consulta de historial, depósitos, retiros y transferencias."
    },

    servers: [
        {
            url: "http://localhost:3000",
            description: "Servidor local"
        }
    ],

    tags: [
        {
            name: "Sistema",
            description:
                "Estado general de la API"
        },
        {
            name: "Autenticación",
            description:
                "Inicio de sesión mediante tarjeta y PIN"
        },
        {
            name: "Operaciones",
            description:
                "Depósitos y retiros"
        },
        {
            name: "Transferencias",
            description:
                "Transferencias internas e interbancarias"
        },
        {
            name: "Historial",
            description:
                "Historial de la cuenta autenticada"
        }
    ],

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        },

        parameters: {
            IdempotencyKey: {
                name: "Idempotency-Key",
                in: "header",
                required: false,
                description:
                    "Clave única para evitar que una operación repetida se ejecute más de una vez.",
                schema: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    example:
                        "operacion-2026-0001"
                }
            }
        },

        schemas: {
            ErrorResponse: {
                type: "object",
                required: [
                    "mensaje"
                ],
                properties: {
                    mensaje: {
                        type: "string",
                        example:
                            "La solicitud no pudo ser procesada"
                    },
                    codigo: {
                        type: "string",
                        example:
                            "REGLA_NEGOCIO"
                    },
                    fecha: {
                        type: "string",
                        format: "date-time"
                    }
                }
            },

            LoginRequest: {
                type: "object",
                required: [
                    "numeroTarjeta",
                    "pin"
                ],
                properties: {
                    numeroTarjeta: {
                        type: "string",
                        example:
                            "4000000000000001"
                    },
                    pin: {
                        type: "string",
                        example:
                            "1234"
                    }
                }
            },

            LoginResponse: {
                type: "object",
                required: [
                    "token",
                    "cuentaId",
                    "numeroCuenta",
                    "saldo"
                ],
                properties: {
                    token: {
                        type: "string",
                        example:
                            "eyJhbGciOiJIUzI1NiIs..."
                    },
                    cuentaId: {
                        type: "integer",
                        example: 1
                    },
                    numeroCuenta: {
                        type: "string",
                        example:
                            "2200000001"
                    },
                    saldo: {
                        type: "number",
                        format: "double",
                        example: 850
                    }
                }
            },

            OperacionRequest: {
                type: "object",
                required: [
                    "monto"
                ],
                properties: {
                    monto: {
                        type: "number",
                        format: "double",
                        minimum: 0.01,
                        example: 100
                    }
                }
            },

            OperacionResponse: {
                type: "object",
                required: [
                    "saldoAnterior",
                    "saldoNuevo",
                    "transaccionId",
                    "movimientoId"
                ],
                properties: {
                    saldoAnterior: {
                        type: "number",
                        format: "double",
                        example: 500
                    },
                    saldoNuevo: {
                        type: "number",
                        format: "double",
                        example: 600
                    },
                    transaccionId: {
                        type: "integer",
                        example: 15
                    },
                    movimientoId: {
                        type: "integer",
                        example: 22
                    }
                }
            },

            TransferenciaInternaRequest: {
                type: "object",
                required: [
                    "cuentaDestinoId",
                    "monto"
                ],
                properties: {
                    cuentaDestinoId: {
                        type: "integer",
                        minimum: 1,
                        example: 2
                    },
                    monto: {
                        type: "number",
                        format: "double",
                        minimum: 0.01,
                        example: 75
                    }
                }
            },

            TransferenciaInterbancariaRequest: {
                type: "object",
                required: [
                    "numeroCuentaDestino",
                    "codigoBancoDestino",
                    "monto"
                ],
                properties: {
                    numeroCuentaDestino: {
                        type: "string",
                        example:
                            "3300000002"
                    },
                    codigoBancoDestino: {
                        type: "string",
                        example:
                            "BANCO2"
                    },
                    monto: {
                        type: "number",
                        format: "double",
                        minimum: 0.01,
                        example: 75
                    }
                }
            },

            TransferenciaResponse: {
                type: "object",
                required: [
                    "tipo",
                    "origen",
                    "transaccionId"
                ],
                properties: {
                    tipo: {
                        type: "string",
                        enum: [
                            "TRANSFERENCIAINTERNA",
                            "TRANSFERENCIAINTERBANCARIA"
                        ]
                    },
                    origen: {
                        type: "object",
                        properties: {
                            cuentaId: {
                                type: "integer"
                            },
                            saldoAnterior: {
                                type: "number"
                            },
                            saldoNuevo: {
                                type: "number"
                            }
                        }
                    },
                    destino: {
                        type: "object",
                        nullable: true,
                        properties: {
                            cuentaId: {
                                type: "integer"
                            },
                            saldoAnterior: {
                                type: "number"
                            },
                            saldoNuevo: {
                                type: "number"
                            }
                        }
                    },
                    transaccionId: {
                        type: "integer"
                    },
                    referenciaExterna: {
                        type: "string",
                        nullable: true
                    }
                }
            },

            HistorialItem: {
                type: "object",
                properties: {
                    movimientoId: {
                        type: "integer"
                    },
                    transaccionId: {
                        type: "integer"
                    },
                    tipo: {
                        type: "string"
                    },
                    monto: {
                        type: "number"
                    },
                    estado: {
                        type: "string"
                    },
                    fecha: {
                        type: "string",
                        format: "date-time"
                    },
                    descripcion: {
                        type: "string",
                        nullable: true
                    },
                    saldoAnterior: {
                        type: "number"
                    },
                    saldoPosterior: {
                        type: "number"
                    }
                }
            }
        }
    },

    paths: {
        "/health": {
            get: {
                tags: [
                    "Sistema"
                ],
                summary:
                    "Comprueba que el proceso de la API está activo",
                responses: {
                    "200": {
                        description:
                            "API activa",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        estado: {
                                            type: "string",
                                            example: "OK"
                                        },
                                        servicio: {
                                            type: "string",
                                            example:
                                                "BancoFuego API"
                                        },
                                        fecha: {
                                            type: "string",
                                            format: "date-time"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/login": {
            post: {
                tags: [
                    "Autenticación"
                ],
                summary:
                    "Autentica una tarjeta mediante su PIN",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/LoginRequest"
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description:
                            "Autenticación correcta",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref:
                                        "#/components/schemas/LoginResponse"
                                }
                            }
                        }
                    },
                    "400": {
                        description:
                            "Datos de entrada incorrectos"
                    },
                    "401": {
                        description:
                            "PIN incorrecto"
                    },
                    "404": {
                        description:
                            "Tarjeta, autenticación o cuenta no encontrada"
                    }
                }
            }
        },

        "/api/operaciones/depositos": {
            post: {
                tags: [
                    "Operaciones"
                ],
                summary:
                    "Realiza un depósito en la cuenta autenticada",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                parameters: [
                    {
                        $ref:
                            "#/components/parameters/IdempotencyKey"
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/OperacionRequest"
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description:
                            "Depósito registrado",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref:
                                        "#/components/schemas/OperacionResponse"
                                }
                            }
                        }
                    },
                    "400": {
                        description:
                            "Monto o cabecera incorrectos"
                    },
                    "401": {
                        description:
                            "Token ausente o inválido"
                    },
                    "409": {
                        description:
                            "Conflicto de idempotencia"
                    }
                }
            }
        },

        "/api/operaciones/retiros": {
            post: {
                tags: [
                    "Operaciones"
                ],
                summary:
                    "Realiza un retiro de la cuenta autenticada",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                parameters: [
                    {
                        $ref:
                            "#/components/parameters/IdempotencyKey"
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref:
                                    "#/components/schemas/OperacionRequest"
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description:
                            "Retiro registrado",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref:
                                        "#/components/schemas/OperacionResponse"
                                }
                            }
                        }
                    },
                    "400": {
                        description:
                            "Monto incorrecto"
                    },
                    "401": {
                        description:
                            "Token ausente o inválido"
                    },
                    "409": {
                        description:
                            "Fondos insuficientes o conflicto de idempotencia"
                    }
                }
            }
        },

        "/api/transferencias": {
            post: {
                tags: [
                    "Transferencias"
                ],
                summary:
                    "Realiza una transferencia interna o interbancaria",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                parameters: [
                    {
                        $ref:
                            "#/components/parameters/IdempotencyKey"
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                oneOf: [
                                    {
                                        $ref:
                                            "#/components/schemas/TransferenciaInternaRequest"
                                    },
                                    {
                                        $ref:
                                            "#/components/schemas/TransferenciaInterbancariaRequest"
                                    }
                                ]
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description:
                            "Transferencia procesada",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref:
                                        "#/components/schemas/TransferenciaResponse"
                                }
                            }
                        }
                    },
                    "400": {
                        description:
                            "Destino o monto incorrecto"
                    },
                    "401": {
                        description:
                            "Token ausente o inválido"
                    },
                    "409": {
                        description:
                            "Conflicto de negocio o idempotencia"
                    }
                }
            }
        },

        "/api/historial/me": {
            get: {
                tags: [
                    "Historial"
                ],
                summary:
                    "Obtiene el historial de la cuenta autenticada",
                security: [
                    {
                        bearerAuth: []
                    }
                ],
                responses: {
                    "200": {
                        description:
                            "Historial recuperado",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        $ref:
                                            "#/components/schemas/HistorialItem"
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description:
                            "Token ausente o inválido"
                    }
                }
            }
        }
    }
};