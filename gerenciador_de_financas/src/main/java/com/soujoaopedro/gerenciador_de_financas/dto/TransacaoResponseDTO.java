package com.soujoaopedro.gerenciador_de_financas.dto;

import com.soujoaopedro.gerenciador_de_financas.domain.TipoTransacao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransacaoResponseDTO(
        UUID id,
        String descricao,
        BigDecimal valor,
        LocalDate data,
        TipoTransacao tipo
) {}
